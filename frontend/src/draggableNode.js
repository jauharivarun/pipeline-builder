import { useStore } from './store';
import { getDefaultNodeData } from './config/nodeRegistry';
import styles from './styles/toolbar.module.css';

export const DraggableNode = ({ type, label, icon: Icon }) => {
  const addNodeByType = useStore((state) => state.addNodeByType);

  const onDragStart = (e) => {
    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Click-to-add: drops the node at the center of the current viewport.
  const onClick = () => {
    addNodeByType(type, getDefaultNodeData);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      addNodeByType(type, getDefaultNodeData);
    }
  };

  return (
    <div
      className={styles.draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      onKeyDown={onKeyDown}
      draggable
      role="button"
      tabIndex={0}
      title={`Drag onto the canvas, or click to add a ${label} node`}
    >
      {Icon && (
        <span className={styles.draggableIcon}>
          <Icon />
        </span>
      )}
      <span className={styles.draggableLabel}>{label}</span>
    </div>
  );
};
