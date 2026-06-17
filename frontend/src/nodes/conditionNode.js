import { BaseNode } from '../components/nodes/BaseNode';
import { NodeField } from '../components/nodes/NodeField';
import { NodeSelect } from '../components/nodes/NodeSelect';
import { ConditionIcon } from '../components/nodes/icons';
import { useNodeData } from '../hooks/useNodeData';

const operatorOptions = [
  { value: '==', label: 'Equals (==)' },
  { value: '!=', label: 'Not equals (!=)' },
  { value: '>', label: 'Greater than (>)' },
  { value: '<', label: 'Less than (<)' },
];

export const ConditionNode = ({ id, data, selected }) => {
  const [operator, , onOperatorChange] = useNodeData(id, 'operator', data?.operator || '==');
  const [compareValue, , onCompareChange] = useNodeData(id, 'compareValue', data?.compareValue || '');

  return (
    <BaseNode
      id={id}
      title="Condition"
      icon={<ConditionIcon />}
      selected={selected}
      handles={[
        { type: 'target', position: 'left', id: 'value' },
        { type: 'source', position: 'right', id: 'true',  top: 33, label: 'true'  },
        { type: 'source', position: 'right', id: 'false', top: 66, label: 'false' },
      ]}
    >
      <NodeSelect label="Operator" value={operator} onChange={onOperatorChange} options={operatorOptions} />
      <NodeField label="Compare to" value={compareValue} onChange={onCompareChange} placeholder="value" />
    </BaseNode>
  );
};
