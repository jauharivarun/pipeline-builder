import { Handle, Position } from 'reactflow';

const positionMap = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
};

const handleStyle = (type) => ({
  width: 10,
  height: 10,
  background: type === 'target' ? 'var(--color-handle-input)' : 'var(--color-handle-output)',
  border: '2px solid var(--color-card)',
});

export const NodeHandles = ({ nodeId, handles = [] }) => (
  <>
    {handles.map(({ type, position, id, top, label, style }) => (
      <Handle
        key={id}
        type={type}
        position={positionMap[position] ?? Position.Left}
        id={`${nodeId}-${id}`}
        title={label || id}
        style={{
          ...handleStyle(type),
          ...(top !== undefined ? { top: `${top}%` } : {}),
          ...style,
        }}
      />
    ))}
  </>
);
