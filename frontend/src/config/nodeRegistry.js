import { InputNode } from '../nodes/inputNode';
import { LLMNode } from '../nodes/llmNode';
import { OutputNode } from '../nodes/outputNode';
import { TextNode } from '../nodes/textNode';
import { ApiNode } from '../nodes/apiNode';
import { ConditionNode } from '../nodes/conditionNode';
import { DatabaseNode } from '../nodes/databaseNode';
import { MathNode } from '../nodes/mathNode';
import { NotificationNode } from '../nodes/notificationNode';
import {
  InputIcon,
  LLMIcon,
  OutputIcon,
  TextIcon,
  ApiIcon,
  ConditionIcon,
  DatabaseIcon,
  MathIcon,
  NotificationIcon,
} from '../components/nodes/icons';

export const nodeRegistry = {
  customInput: {
    component: InputNode,
    label: 'Input',
    category: 'core',
    icon: InputIcon,
    defaultData: { inputType: 'Text', inputValue: '' },
  },
  llm: {
    component: LLMNode,
    label: 'LLM',
    category: 'core',
    icon: LLMIcon,
    defaultData: {
      model: 'gpt-4o-mini',
      systemPrompt: 'You are a helpful assistant.',
      userPrompt: '',
    },
  },
  text: {
    component: TextNode,
    label: 'Text',
    category: 'core',
    icon: TextIcon,
    defaultData: { text: '{{input}}' },
  },
  customOutput: {
    component: OutputNode,
    label: 'Output',
    category: 'core',
    icon: OutputIcon,
    defaultData: { outputType: 'Text' },
  },
  api: {
    component: ApiNode,
    label: 'API',
    category: 'tools',
    icon: ApiIcon,
    defaultData: { method: 'GET', url: '' },
  },
  condition: {
    component: ConditionNode,
    label: 'Condition',
    category: 'tools',
    icon: ConditionIcon,
    defaultData: { operator: '==', compareValue: '' },
  },
  database: {
    component: DatabaseNode,
    label: 'Database',
    category: 'tools',
    icon: DatabaseIcon,
    defaultData: { operation: 'SELECT', table: '' },
  },
  math: {
    component: MathNode,
    label: 'Math',
    category: 'tools',
    icon: MathIcon,
    defaultData: { operation: 'add' },
  },
  notification: {
    component: NotificationNode,
    label: 'Notification',
    category: 'tools',
    icon: NotificationIcon,
    defaultData: { channel: 'Email', recipient: '' },
  },
};

export const getNodeTypes = () =>
  Object.fromEntries(
    Object.entries(nodeRegistry).map(([type, config]) => [type, config.component])
  );

export const getPaletteNodes = () =>
  Object.entries(nodeRegistry).map(([type, config]) => ({
    type,
    label: config.label,
    icon: config.icon,
    category: config.category,
  }));

export const getPaletteNodesByCategory = () => {
  const nodes = getPaletteNodes();
  return {
    core: nodes.filter((node) => node.category === 'core'),
    tools: nodes.filter((node) => node.category === 'tools'),
  };
};

export const getDefaultNodeData = (nodeId, type) => {
  const config = nodeRegistry[type];
  return {
    id: nodeId,
    nodeType: type,
    ...(config?.defaultData ?? {}),
  };
};
