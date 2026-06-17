import { useEffect } from 'react';
import styles from '../styles/modal.module.css';
import { API_BASE, fetchWithTimeout } from '../config/api';

// ── icons ──────────────────────────────────────────────────────────────────

const PlayIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const OutputIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

// ── markdown-table → HTML (simple parser) ─────────────────────────────────

function parseMarkdownTable(md) {
  if (!md || typeof md !== 'string') return null;
  const lines = md.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return null;

  const parseRow = (line) =>
    line.split('|').map((c) => c.trim()).filter((_, i, a) => i !== 0 && i !== a.length - 1);

  const headers = parseRow(lines[0]);
  // Skip separator line (line[1] contains ---)
  const rows = lines.slice(2).map(parseRow);

  if (!headers.length) return null;
  return { headers, rows };
}

// ── Excel download helper ─────────────────────────────────────────────────

async function downloadExcel(dataframeJson, columns, outputLabel) {
  try {
    const data = JSON.parse(dataframeJson);
    const res  = await fetchWithTimeout(`${API_BASE}/api/generate-excel`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ data, columns, filename: outputLabel }),
    });
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${outputLabel}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert(`Download failed: ${e.message}`);
  }
}

// ── Output block ──────────────────────────────────────────────────────────

function OutputBlock({ label, output }) {
  const { value, data_type, dataframe_json, columns } = output;
  const tableData = data_type === 'excel' ? parseMarkdownTable(value) : null;
  const canDownload = data_type === 'excel' && dataframe_json;

  return (
    <div className={styles.resultBlock}>
      <div className={styles.resultBlockHeader}>
        <OutputIcon />
        <span style={{ flex: 1 }}>{label}</span>
        <span className={styles.dataTypeBadge}>{data_type || 'text'}</span>
        {canDownload && (
          <button
            className={styles.downloadBtn}
            onClick={() => downloadExcel(dataframe_json, columns, label)}
            title="Download as Excel"
          >
            <DownloadIcon /> .xlsx
          </button>
        )}
      </div>

      <div className={styles.resultBlockBody}>
        {!value ? (
          <span className={styles.resultEmpty}>(empty)</span>
        ) : tableData ? (
          <div className={styles.tableWrapper}>
            <table className={styles.previewTable}>
              <thead>
                <tr>
                  {tableData.headers.map((h, i) => <th key={i}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => <td key={ci}>{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

// ── Error block ───────────────────────────────────────────────────────────

function ErrorBlock({ errors }) {
  const entries = Object.entries(errors);
  if (!entries.length) return null;
  return (
    <div className={styles.resultBlock}>
      <div className={styles.resultBlockHeader}>
        <span className={styles.errorBadge}>
          {entries.length} Error{entries.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className={styles.resultBlockBody}>
        {entries.map(([nodeId, info]) => (
          <div key={nodeId} className={styles.errorItem}>
            <div className={styles.errorItemHeader}>
              <span className={styles.errorNodeType}>{info.node_type}</span>
              <span className={styles.errorNodeLabel}>{info.node_label}</span>
            </div>
            <div className={styles.errorItemMessage}>{info.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────

export const ExecutionResultModal = ({ state, onClose }) => {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!state) return null;

  const { success, output_summary, errors } = state;
  const outputEntries  = Object.entries(output_summary || {});
  const activeOutputs  = outputEntries.filter(([, o]) => (o?.value || '').trim());
  const hasOutputs     = outputEntries.length > 0;
  const hasErrors      = Object.keys(errors || {}).length > 0;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="exec-title">
        {/* Header */}
        <div className={success ? styles.headerExec : styles.headerError}>
          <span className={success ? styles.iconBadgePrimary : styles.iconBadgeError}>
            <PlayIcon />
          </span>
          <div>
            <h2 id="exec-title" className={styles.headerTitle}>
              {success ? 'Pipeline Executed' : 'Execution Completed with Errors'}
            </h2>
            <p className={styles.headerSubtitle}>
              {hasOutputs
                ? `${activeOutputs.length} active output${activeOutputs.length !== 1 ? 's' : ''}`
                  + (outputEntries.length > activeOutputs.length
                    ? ` (${outputEntries.length - activeOutputs.length} inactive)`
                    : '')
                : 'No Output nodes in pipeline'}
              {hasErrors ? ` • ${Object.keys(errors).length} error(s)` : ''}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {hasOutputs
            ? outputEntries.map(([label, output]) => (
                <OutputBlock key={label} label={label} output={output} />
              ))
            : (
              <div className={styles.resultBlock}>
                <div className={styles.resultBlockBody}>
                  <span className={styles.resultEmpty}>
                    Add an Output node to see results here.
                  </span>
                </div>
              </div>
            )
          }

          {hasErrors && <ErrorBlock errors={errors} />}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.closeButton} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
};
