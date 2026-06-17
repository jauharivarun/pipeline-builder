import { useEffect } from 'react';
import styles from '../styles/modal.module.css';

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CrossIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const WarnIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const SuccessModal = ({ result, onClose }) => (
  <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div className={styles.headerSuccess}>
      <span className={styles.iconBadgeSuccess}><CheckIcon /></span>
      <div>
        <h2 id="modal-title" className={styles.headerTitle}>Pipeline Analysis</h2>
        <p className={styles.headerSubtitle}>Validation complete</p>
      </div>
    </div>
    <div className={styles.body}>
      <div className={styles.statRow}>
        <span className={styles.statLabel}>Total Nodes</span>
        <span className={styles.statValue}>{result.num_nodes}</span>
      </div>
      <div className={styles.statRow}>
        <span className={styles.statLabel}>Total Edges</span>
        <span className={styles.statValue}>{result.num_edges}</span>
      </div>
      <div className={styles.statRow}>
        <span className={styles.statLabel}>Is a DAG?</span>
        <span className={`${styles.statValue} ${result.is_dag ? styles.dagYes : styles.dagNo}`}>
          {result.is_dag ? '✓ Yes — no cycles detected' : '✗ No — cycle detected'}
        </span>
      </div>
    </div>
    <div className={styles.footer}>
      <button className={styles.closeButton} onClick={onClose}>Done</button>
    </div>
  </div>
);

// Empty pipeline — user forgot to add nodes
const EmptyModal = ({ onClose }) => (
  <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div className={styles.headerWarn}>
      <span className={styles.iconBadgeWarn}><WarnIcon /></span>
      <div>
        <h2 id="modal-title" className={styles.headerTitle}>Pipeline is empty</h2>
        <p className={styles.headerSubtitle}>Nothing to validate</p>
      </div>
    </div>
    <div className={styles.body}>
      <div className={styles.errorMessage}>
        Add at least one node to your pipeline before submitting.
        <br /><br />
        Drag a node from the toolbar onto the canvas to get started.
      </div>
    </div>
    <div className={styles.footer}>
      <button className={styles.closeButton} onClick={onClose}>Got it</button>
    </div>
  </div>
);

// Backend unreachable or server error
const ConnectionErrorModal = ({ message, onClose }) => (
  <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div className={styles.headerError}>
      <span className={styles.iconBadgeError}><CrossIcon /></span>
      <div>
        <h2 id="modal-title" className={styles.headerTitle}>Unable to validate</h2>
        <p className={styles.headerSubtitle}>Backend connection failed</p>
      </div>
    </div>
    <div className={styles.body}>
      <div className={styles.errorMessage}>
        Make sure the backend server is running:
        <code>uvicorn main:app --reload</code>
        {message && (
          <code style={{ color: 'var(--color-error)', marginTop: 6 }}>
            Error: {message}
          </code>
        )}
      </div>
    </div>
    <div className={styles.footer}>
      <button className={styles.closeButton} onClick={onClose}>Close</button>
    </div>
  </div>
);

export const PipelineResultModal = ({ state, onClose }) => {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!state) return null;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {state.type === 'success' && <SuccessModal result={state.result} onClose={onClose} />}
      {state.type === 'empty'   && <EmptyModal onClose={onClose} />}
      {state.type === 'error'   && <ConnectionErrorModal message={state.message} onClose={onClose} />}
    </div>
  );
};
