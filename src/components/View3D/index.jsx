import styles from './View3D.module.css';

import { useTileMap } from '../../contexts/TileMapContext';
import { useState, lazy, Suspense } from 'react';

import { Modal } from '../Modal';
import { Tooltip } from '../Tooltip';
import { LuAxis3D } from "react-icons/lu";

// Three.js só é baixado quando o modal 3D abre (lazy chunk), aliviando o bundle inicial.
const Scene3D = lazy(() => import('./Scene3D'));

export function View3D() {
  const [isModal3d, setModal3d] = useState(false);

  const { tilemap } = useTileMap();

  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, text: '' });

  const handleMouseMove = (e, name) => {
    setTooltip({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        text: name
    });
  }

  const handleMouseLeave = () => {
    setTooltip({ visible: false, x: 0, y: 0, text: '' });
  };

  return (
    <>
      <Modal active={isModal3d} buttons={false} setActive={setModal3d} showButtonClose={true}>
        {isModal3d && (
          <Suspense fallback={<div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Carregando 3D…</div>}>
            <Scene3D tilemap={tilemap} />
          </Suspense>
        )}
      </Modal>

      <button
        className={styles.card}
        onClick={() => setModal3d(true)}
        aria-label="Pré-visualização 3D"
        onMouseMove={(e) => handleMouseMove(e, "visualização 3d")}
        onMouseLeave={handleMouseLeave}
      >
        <LuAxis3D className={styles.iconee} />
      </button>

      {tooltip.visible && (
        <Tooltip texto={tooltip.text} x={tooltip.x} y={tooltip.y}/>
      )}
    </>
  );
}
