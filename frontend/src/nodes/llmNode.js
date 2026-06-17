import { BaseNode } from '../components/nodes/BaseNode';
import { NodeSelect } from '../components/nodes/NodeSelect';
import { NodeField } from '../components/nodes/NodeField';
import { LLMIcon } from '../components/nodes/icons';
import { useNodeData } from '../hooks/useNodeData';
import styles from '../styles/nodes.module.css';

const modelOptions = [
  { value: 'gpt-4o-mini',       label: 'GPT-4o Mini (OpenAI)' },
  { value: 'gemini-2.0-flash',  label: 'Gemini 2.0 Flash (Google)' },
];

export const LLMNode = ({ id, data, selected }) => {
  const [model,        , onModelChange]  = useNodeData(id, 'model',        data?.model        || 'gpt-4o-mini');
  const [systemPrompt, , onSystemChange] = useNodeData(id, 'systemPrompt', data?.systemPrompt || 'You are a helpful assistant.');
  const [userPrompt,   , onPromptChange] = useNodeData(id, 'userPrompt',   data?.userPrompt   || '');

  return (
    <BaseNode
      id={id}
      title="LLM"
      icon={<LLMIcon />}
      selected={selected}
      handles={[
        { type: 'target', position: 'left', id: 'system', top: 33, label: 'system' },
        { type: 'target', position: 'left', id: 'prompt', top: 66, label: 'prompt' },
        { type: 'source', position: 'right', id: 'response' },
      ]}
    >
      <NodeSelect label="Model" value={model} onChange={onModelChange} options={modelOptions} />
      <NodeField
        label="System Prompt (or connect handle)"
        value={systemPrompt}
        onChange={onSystemChange}
        placeholder="You are a helpful assistant."
        multiline
      />
      <NodeField
        label="User Prompt (or connect handle)"
        value={userPrompt}
        onChange={onPromptChange}
        placeholder="What would you like to ask?"
        multiline
      />
      <p className={styles.description}>
        Connected handles override text fields.
      </p>
    </BaseNode>
  );
};
