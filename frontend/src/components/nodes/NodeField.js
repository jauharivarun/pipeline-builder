import { useEffect, useRef } from 'react';
import styles from '../../styles/nodes.module.css';

/**
 * NodeField — single-line input (default) or auto-expanding textarea (multiline).
 * Pass `multiline` to get a textarea that grows with content.
 */
export const NodeField = ({ label, value, onChange, placeholder, multiline = false }) => {
  const textareaRef = useRef(null);

  // Auto-resize on every value change
  useEffect(() => {
    if (!multiline || !textareaRef.current) return;
    const el = textareaRef.current;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value, multiline]);

  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      {multiline ? (
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={2}
        />
      ) : (
        <input
          className={styles.input}
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
      )}
    </label>
  );
};
