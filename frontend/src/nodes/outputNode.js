import { BaseNode } from '../components/nodes/BaseNode';
import { NodeField } from '../components/nodes/NodeField';
import { NodeSelect } from '../components/nodes/NodeSelect';
import { OutputIcon } from '../components/nodes/icons';
import { useNodeData } from '../hooks/useNodeData';
import styles from '../styles/nodes.module.css';

const outputFormatOptions = [
  { value: 'auto',  label: 'Auto (match input format)' },
  { value: 'text',  label: 'Text'  },
  { value: 'excel', label: 'Excel (.xlsx download)' },
  { value: 'pdf',   label: 'PDF (text extract)' },
];

export const OutputNode = ({ id, data, selected }) => {
  const defaultName   = id.replace('customOutput-', 'output_');
  const [name,       , onNameChange]   = useNodeData(id, 'outputName',   data?.outputName   || defaultName);
  const [outputFormat, , onFormatChange] = useNodeData(id, 'outputFormat', data?.outputFormat || 'auto');

  return (
    <BaseNode
      id={id}
      title="Output"
      icon={<OutputIcon />}
      selected={selected}
      handles={[{ type: 'target', position: 'left', id: 'value' }]}
    >
      <NodeField label="Name" value={name} onChange={onNameChange} />
      <NodeSelect
        label="Format"
        value={outputFormat}
        onChange={onFormatChange}
        options={outputFormatOptions}
      />
      <p className={styles.description}>
        "Auto" keeps Excel as Excel, PDF as text, text as text.
      </p>
    </BaseNode>
  );
};
