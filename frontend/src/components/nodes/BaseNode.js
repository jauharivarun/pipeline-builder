import { useEffect } from 'react';
import { useUpdateNodeInternals } from 'reactflow';
import { NodeHandles } from './NodeHandles';
import styles from '../../styles/nodes.module.css';

export const BaseNode = ({ id, title, icon, handles = [], selected, style, children }) => {
  const updateNodeInternals = useUpdateNodeInternals();

  // Re-register handles with React Flow whenever the handles array changes
  // (critical for dynamic handles like TextNode's {{variable}} targets)
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, handles.length, updateNodeInternals]);

  return (
    <div className={`${styles.node} ${selected ? styles.nodeSelected : ''}`} style={style}>
      <NodeHandles nodeId={id} handles={handles} />
      <div className={styles.header}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <span className={styles.title}>{title}</span>
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
};
