import { BaseNode } from '../components/nodes/BaseNode';
import { NodeField } from '../components/nodes/NodeField';
import { NodeSelect } from '../components/nodes/NodeSelect';
import { NotificationIcon } from '../components/nodes/icons';
import { useNodeData } from '../hooks/useNodeData';

const channelOptions = [
  { value: 'Email', label: 'Email' },
  { value: 'Slack', label: 'Slack' },
  { value: 'Webhook', label: 'Webhook' },
];

export const NotificationNode = ({ id, data, selected }) => {
  const [channel, , onChannelChange] = useNodeData(id, 'channel', data?.channel || 'Email');
  const [recipient, , onRecipientChange] = useNodeData(id, 'recipient', data?.recipient || '');

  return (
    <BaseNode
      id={id}
      title="Notification"
      icon={<NotificationIcon />}
      selected={selected}
      handles={[{ type: 'target', position: 'left', id: 'message' }]}
    >
      <NodeSelect label="Channel" value={channel} onChange={onChannelChange} options={channelOptions} />
      <NodeField label="Recipient" value={recipient} onChange={onRecipientChange} placeholder="user@example.com" />
    </BaseNode>
  );
};
