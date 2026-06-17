import { BaseNode } from '../components/nodes/BaseNode';
import { NodeSelect } from '../components/nodes/NodeSelect';
import { MathIcon } from '../components/nodes/icons';
import { useNodeData } from '../hooks/useNodeData';

const operationOptions = [
  { value: 'add', label: 'Add' },
  { value: 'subtract', label: 'Subtract' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'divide', label: 'Divide' },
];

export const MathNode = ({ id, data, selected }) => {
  const [operation, , onOperationChange] = useNodeData(id, 'operation', data?.operation || 'add');

  return (
    <BaseNode
      id={id}
      title="Math"
      icon={<MathIcon />}
      selected={selected}
      handles={[
        { type: 'target', position: 'left', id: 'a', top: 33 },
        { type: 'target', position: 'left', id: 'b', top: 66 },
        { type: 'source', position: 'right', id: 'result' },
      ]}
    >
      <NodeSelect label="Operation" value={operation} onChange={onOperationChange} options={operationOptions} />
    </BaseNode>
  );
};
