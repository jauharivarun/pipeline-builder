import { BaseNode } from '../components/nodes/BaseNode';
import { NodeField } from '../components/nodes/NodeField';
import { NodeSelect } from '../components/nodes/NodeSelect';
import { ApiIcon } from '../components/nodes/icons';
import { useNodeData } from '../hooks/useNodeData';

const methodOptions = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
];

export const ApiNode = ({ id, data, selected }) => {
  const [method, , onMethodChange] = useNodeData(id, 'method', data?.method || 'GET');
  const [url, , onUrlChange] = useNodeData(id, 'url', data?.url || '');

  return (
    <BaseNode
      id={id}
      title="API"
      icon={<ApiIcon />}
      selected={selected}
      handles={[
        { type: 'target', position: 'left', id: 'url', top: 33 },
        { type: 'target', position: 'left', id: 'body', top: 66 },
        { type: 'source', position: 'right', id: 'response' },
      ]}
    >
      <NodeSelect label="Method" value={method} onChange={onMethodChange} options={methodOptions} />
      <NodeField label="URL" value={url} onChange={onUrlChange} placeholder="https://api.example.com" />
    </BaseNode>
  );
};
