import styles from './View3D.module.css';

import { useEffect, useRef } from 'react';

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/**
 * Scene3D — renderização Three.js do mapa.
 * Carregado via lazy import (React.lazy) somente quando o modal 3D abre,
 * para que a biblioteca three.js não pese no bundle inicial do editor.
 */
export default function Scene3D({ tilemap }) {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xabcdef);

    const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000 );

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountRef.current.appendChild(renderer.domElement);

    const light = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(light);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(0, 10, 5);
    scene.add(directionalLight);

    const tileSize = 1;
    const floorHeight = 1;
    const wallHeight = 1.5;
    const wallThickness = 1;

    const textureLoader = new THREE.TextureLoader();
    const gltfLoader = new GLTFLoader();

    function createMaterial(texturePath) {
      const texture = textureLoader.load(texturePath);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 1);
      return new THREE.MeshStandardMaterial({ map: texture });
    }

    const width = tilemap.width;
    const height = tilemap.height;

    const floorLayer = tilemap.layers.filter(layer => layer.id === 'floor');

    if (floorLayer.length) {
      for (const sprite of floorLayer[0].sprites) {

          if (!sprite.visible) continue;

          const { x, y, path, size } = sprite;
          const cols = size?.[0] || 1;
          const rows = size?.[1] || 1;

          const material = createMaterial(path);
          const floor = new THREE.Mesh(
            new THREE.BoxGeometry(tileSize * cols, floorHeight, tileSize * rows),
            material
          );

          // Posiciona centralizado se for maior que 1x1
          floor.position.set(
            (x + cols / 2 - 0.5) * tileSize,
            floorHeight / 2,
            (y + rows / 2 - 0.5) * tileSize
          );

          floor.rotation.y = THREE.MathUtils.degToRad(sprite.rotation ?? 0);

          scene.add(floor);
      }
    }

    const wallLayer = tilemap.layers.filter(layer => layer.id === 'walls');

    if (wallLayer.length) {
      for (const sprite of wallLayer[0].sprites) {
        if (!sprite.visible) continue;

        const { x, y, path, size, direction, align, rotation } = sprite;
        const cols = size?.[0] || 1;
        const rows = size?.[1] || 1;

        const material = createMaterial(path);

        // Define orientação da parede: vertical (E ↔ D) ou horizontal (N ↕ S)
        const isVertical = direction === 'vertical';
        const geometry = isVertical
          ? new THREE.BoxGeometry(wallThickness * cols, wallHeight, tileSize * rows)
          : new THREE.BoxGeometry(tileSize * cols, wallHeight, wallThickness * rows);

        const wall = new THREE.Mesh(geometry, material);

        // Posição base (como o código original)
        let posX = x * tileSize;
        let posZ = y * tileSize;

        // Alinhamento opcional
        const effectiveAlign = align || 'center';

        if (isVertical) {
          if (effectiveAlign === 'left') posX -= tileSize / 2 - wallThickness / 2;
          else if (effectiveAlign === 'right') posX += tileSize / 2 - wallThickness / 2;
        } else {
          if (effectiveAlign === 'top') posZ -= tileSize / 2 - wallThickness / 2;
          else if (effectiveAlign === 'bottom') posZ += tileSize / 2 - wallThickness / 2;
        }

        wall.position.set(
          posX + (cols / 2 - 0.5) * tileSize,
          wallHeight / 2 + floorHeight,
          posZ + (rows / 2 - 0.5) * tileSize
        );

        wall.rotation.y = THREE.MathUtils.degToRad(rotation ?? 0);

        scene.add(wall);
      }
    }

    // Demais camadas (portas/janelas, móveis, eletrônicos, utensílios, interativos, pessoas)
    // como billboards verticais voltados para a câmera, usando a textura do próprio sprite.
    const billboards = [];
    const objectLayers = ['door_and_windows', 'furniture', 'eletronics', 'utensils', 'interactive_elements', 'persons'];

    for (const layerId of objectLayers) {
      const objLayer = tilemap.layers.filter(layer => layer.id === layerId);
      if (!objLayer.length) continue;

      for (const sprite of objLayer[0].sprites) {
        if (sprite.visible === false) continue;

        const { x, y, path, size } = sprite;
        const cols = size?.[0] || 1;
        const rows = size?.[1] || 1;

        const texture = textureLoader.load(path);
        texture.colorSpace = THREE.SRGBColorSpace;

        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          alphaTest: 0.5,
          side: THREE.DoubleSide,
        });

        const planeW = tileSize * cols;
        const planeH = tileSize * rows;
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeH), material);

        mesh.position.set(
          (x + cols / 2 - 0.5) * tileSize,
          floorHeight + planeH / 2,
          (y + rows / 2 - 0.5) * tileSize
        );

        billboards.push(mesh);
        scene.add(mesh);
      }
    }

    camera.position.set(2.5, 5, 7);
    camera.lookAt(new THREE.Vector3(2.5, 0, 2.5));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = true;
    controls.enableDamping = true;
    controls.dampingFactor = 1;
    controls.enablePan = true;
    controls.target.set(2.5, 0, 2.5);
    controls.update();

    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      // Billboards sempre de frente para a câmera
      for (const b of billboards) b.quaternion.copy(camera.quaternion);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      controls.dispose();
      renderer.dispose();
      if (mountRef.current) { mountRef.current.removeChild(renderer.domElement); }
    };

  }, []);

  return <div className={styles.container} ref={mountRef}></div>;
}
