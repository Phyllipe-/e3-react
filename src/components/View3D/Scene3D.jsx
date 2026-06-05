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

    // ---- Camadas com MODELOS 3D (.glb exportados do ENA) ----
    // Interativos: mapeados pelo translate do sprite. Pessoas: modelo "Kid".
    const TRANSLATE_TO_MODEL = {
      // Interativos
      dog: 'Dog', frog: 'Frog', bug: 'Insect', dryer: 'HairDryer', radio: 'Radio',
      blender: 'Blender', alarm: 'AlarmClock', bird: 'Bird', kettle: 'TeaKettle',
      mixer: 'FoodMixer', printer: 'Printer', fan: 'Fan', cat: 'Cat', phone: 'Cellphone', baby: 'Kid',
      // Eletrodomésticos
      computer: 'Computer', copier: 'CopyMachine', stove: 'Stove', refrigerator: 'Fridge',
      washing_machine: 'WashingMachine', microwave: 'Microwave', television: 'TV',
      // Móveis
      double_bed: 'CouplesBed', single_bed: 'SinglesBed', cabinet: 'IronCloset', dresser: 'Bureau',
      table: 'Table', dining_table: 'DiningTable', armchair: 'Armchair', chair: 'Chair',
      nightstand: 'BedTable', shelf: 'Shelf', wardrobe: 'Wardrobe', sofa: 'Sofa',
      // Portas e janelas
      locked_door: 'LockedDoor', closed_door: 'ClosedDoor', open_door: 'OpenDoor',
      steel_window: 'GlassWindow', wooden_window: 'WoodenWindow',
      // Utensílios
      cone: 'Cone', lamp: 'Lamp', flower: 'Plant', trash: 'TrashCan', sink: 'Sink',
      piano: 'Piano', toilet: 'Toilet', frame: 'Painting', guitar: 'Guitar',
    };

    function addModel(file, x, y, cols, rows, rotationDeg, fitWidthTiles) {
      gltfLoader.load(`/models/${file}.glb`, (gltf) => {
        const model = gltf.scene;
        // Escala nativa do prefab (ENA autora os modelos para 1 tile = 1 unidade).
        // Rotação: negada pelo handedness (Unity->glTF) + 180° de offset de base
        // (sem isso o objeto fica de costas, ex.: sofá virado para a parede).
        model.rotation.y = Math.PI - THREE.MathUtils.degToRad(rotationDeg || 0);

        // Algumas categorias (portas/janelas) têm escala nativa muito maior;
        // ajusta a largura horizontal ao número de tiles informado.
        if (fitWidthTiles) {
          const b = new THREE.Box3().setFromObject(model);
          const d = b.getSize(new THREE.Vector3());
          const maxXZ = Math.max(d.x, d.z) || 1;
          model.scale.setScalar((fitWidthTiles * tileSize) / maxXZ);
        }

        // Centraliza no tile e apoia a base no piso.
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.x += (x + cols / 2 - 0.5) * tileSize - center.x;
        model.position.z += (y + rows / 2 - 0.5) * tileSize - center.z;
        model.position.y += floorHeight - box.min.y;

        scene.add(model);
      }, undefined, (err) => console.warn('[3D] falha ao carregar modelo', file, err));
    }

    // Todas as camadas de objeto agora usam modelos 3D (.glb do ENA).
    const modelLayers = ['interactive_elements', 'persons', 'eletronics', 'furniture', 'door_and_windows', 'utensils'];
    for (const layerId of modelLayers) {
      const objLayer = tilemap.layers.filter(layer => layer.id === layerId);
      if (!objLayer.length) continue;
      for (const sprite of objLayer[0].sprites) {
        if (sprite.visible === false) continue;
        const cols = sprite.size?.[0] || 1;
        const rows = sprite.size?.[1] || 1;
        const file = layerId === 'persons' ? 'Kid' : TRANSLATE_TO_MODEL[sprite.translate];
        if (!file) continue;
        // Portas/janelas têm escala nativa exagerada: ajusta a largura ao tile.
        const fit = layerId === 'door_and_windows' ? cols : null;
        addModel(file, sprite.x, sprite.y, cols, rows, sprite.rotation, fit);
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
