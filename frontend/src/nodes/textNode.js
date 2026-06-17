import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { parseVariables } from '../utils/parseVariables';
import { computeNodeWidth } from '../utils/computeNodeWidth';
import { TextIcon } from '../components/nodes/icons';
import { BaseNode } from '../components/nodes/BaseNode';
import styles from '../styles/nodes.module.css';

const buildHandles = (variables) => {
  const inputHandles = variables.map((varName, i) => {
    const topPct =
      variables.length === 1
        ? 50
        : 20 + (i * 60) / Math.max(variables.length - 1, 1);
    return {
      type: 'target',
      position: 'left',
      id: varName,
      top: topPct,
      label: varName,
    };
  });

  return [
    ...inputHandles,
    { type: 'source', position: 'right', id: 'output' },
  ];
};

export const TextNode = ({ id, data, selected }) => {
  const textareaRef = useRef(null);

  const text = useStore(
    (s) => s.nodes.find((n) => n.id === id)?.data?.text ?? data?.text ?? '{{input}}'
  );
  const updateNodeField = useStore((s) => s.updateNodeField);

  const variables = parseVariables(text);
  const handles = buildHandles(variables);
  const width = computeNodeWidth([text]);

  const onChange = (e) => {
    updateNodeField(id, 'text', e.target.value);
  };

  // Auto-resize textarea height to fit content (runs after width is applied,
  // so wrapping is measured against the current node width).
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, [text, width]);

  return (
    <BaseNode
      id={id}
      title="Text"
      icon={<TextIcon />}
      selected={selected}
      handles={handles}
      style={{ width, minWidth: width, maxWidth: width }}
    >
      <label className={styles.field}>
        <span className={styles.label}>Template</span>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={text}
          onChange={onChange}
          placeholder="Type text or use {{variable}} syntax"
          rows={3}
        />
      </label>

      {variables.length > 0 && (
        <>
          <div className={styles.variablePills}>
            {variables.map((v) => (
              <span key={v} className={styles.pill}>{`{{${v}}}`}</span>
            ))}
          </div>
          <p className={styles.description}>
            Connect each variable: drag Input&apos;s right handle → left handle labelled with the variable name.
          </p>
        </>
      )}
    </BaseNode>
  );
};
