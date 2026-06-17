import { useState, useCallback } from 'react';
import { useStore } from './store';
import { shallow } from 'zustand/shallow';
import { PipelineResultModal } from './components/PipelineResultModal';
import { ExecutionResultModal } from './components/ExecutionResultModal';
import styles from './styles/buttons.module.css';
import { API_BASE, fetchWithTimeout } from './config/api';

const selector = (state) => ({
  nodes: state.nodes,
  edges: state.edges,
});

export const SubmitButton = () => {
  const [loading,      setLoading]      = useState(false);
  const [execLoading,  setExecLoading]  = useState(false);
  const [modalState,   setModalState]   = useState(null);
  const [execResult,   setExecResult]   = useState(null);

  const { nodes, edges } = useStore(selector, shallow);

  // ── Validate (parse) ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (nodes.length === 0) {
      setModalState({ type: 'empty' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetchWithTimeout(`${API_BASE}/api/pipelines/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges }),
      });

      if (!response.ok) throw new Error(`Server responded with status ${response.status}`);

      const result = await response.json();
      setModalState({ type: 'success', result });
    } catch (err) {
      setModalState({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // ── Execute ───────────────────────────────────────────────────────────────
  const handleExecute = async () => {
    if (nodes.length === 0) {
      setModalState({ type: 'empty' });
      return;
    }

    setExecLoading(true);
    try {
      const response = await fetchWithTimeout(`${API_BASE}/api/pipelines/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges }),
      }, 60000);

      if (!response.ok) throw new Error(`Server responded with status ${response.status}`);

      const result = await response.json();
      setExecResult(result);
    } catch (err) {
      setExecResult({
        success: false,
        output_summary: {},
        errors: { connection: `Could not reach the backend: ${err.message}. Make sure the server is running (uvicorn main:app --reload).` },
      });
    } finally {
      setExecLoading(false);
    }
  };

  const closeModal     = useCallback(() => setModalState(null), []);
  const closeExecModal = useCallback(() => setExecResult(null), []);

  return (
    <>
      <PipelineResultModal  state={modalState} onClose={closeModal}     />
      <ExecutionResultModal state={execResult}  onClose={closeExecModal} />

      <div className={styles.submitArea}>
        <button
          type="button"
          className={styles.submitButton}
          onClick={handleSubmit}
          disabled={loading || execLoading}
        >
          {loading ? (
            <><span className={styles.spinner} />Validating…</>
          ) : 'Validate Pipeline'}
        </button>

        <button
          type="button"
          className={styles.executeButton}
          onClick={handleExecute}
          disabled={loading || execLoading}
        >
          {execLoading ? (
            <><span className={styles.spinner} />Executing…</>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 6 }}>
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Execute Pipeline
            </>
          )}
        </button>
      </div>
    </>
  );
};
