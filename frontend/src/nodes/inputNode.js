import { useRef, useState } from 'react';
import { BaseNode } from '../components/nodes/BaseNode';
import { NodeField } from '../components/nodes/NodeField';
import { NodeSelect } from '../components/nodes/NodeSelect';
import { InputIcon } from '../components/nodes/icons';
import { useNodeData } from '../hooks/useNodeData';
import { useStore } from '../store';
import styles from '../styles/nodes.module.css';
import { API_BASE, fetchWithTimeout } from '../config/api';
import { computeNodeWidth } from '../utils/computeNodeWidth';

const inputTypeOptions = [
  { value: 'Text',  label: 'Text'  },
  { value: 'Excel', label: 'Excel / CSV' },
  { value: 'PDF',   label: 'PDF'   },
];

const TYPE_ICONS = { Excel: '📊', PDF: '📄', Text: '📝' };
const ACCEPTED   = { Text: '.txt', Excel: '.xlsx,.xls,.csv', PDF: '.pdf' };

export const InputNode = ({ id, data, selected }) => {
  const defaultName = id.replace('customInput-', 'input_');
  const [name,       , onNameChange]  = useNodeData(id, 'inputName',  data?.inputName  || defaultName);
  const [inputType,  , onTypeChange]  = useNodeData(id, 'inputType',  data?.inputType  || 'Text');
  const [inputValue, , onValueChange] = useNodeData(id, 'inputValue', data?.inputValue || '');
  const [fileId,     , onFileIdChange]  = useNodeData(id, 'fileId',    data?.fileId    || '');
  const [fileName,   , onFileNameChange] = useNodeData(id, 'fileName', data?.fileName  || '');
  const [fileMeta,   , onFileMetaChange] = useNodeData(id, 'fileMeta', data?.fileMeta  || '');

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const updateNodeField = useStore((s) => s.updateNodeField);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError('');

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/upload`, { method: 'POST', body: form }, 30000);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || `Upload failed (${res.status})`);
      }
      const info = await res.json();

      // Store all file metadata in node data
      updateNodeField(id, 'fileId',    info.file_id);
      updateNodeField(id, 'fileName',  info.filename);
      updateNodeField(id, 'fileType',  info.type);
      const meta = info.row_count != null
        ? `${info.row_count} rows × ${info.col_count} cols • ${info.size_kb} KB`
        : `${info.size_kb} KB`;
      updateNodeField(id, 'fileMeta',  meta);
      updateNodeField(id, 'inputValue', '');   // clear text value when file chosen

    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = () => {
    updateNodeField(id, 'fileId',    '');
    updateNodeField(id, 'fileName',  '');
    updateNodeField(id, 'fileMeta',  '');
    updateNodeField(id, 'fileType',  '');
  };

  const isFileMode = inputType !== 'Text';
  const hasFile    = !!data?.fileId;

  // Grow width first (from the Name / Value text), then let fields wrap downward.
  const width = computeNodeWidth(isFileMode ? [name] : [name, inputValue]);

  return (
    <BaseNode
      id={id}
      title="Input"
      icon={<InputIcon />}
      selected={selected}
      handles={[{ type: 'source', position: 'right', id: 'value' }]}
      style={{ width, minWidth: width, maxWidth: width }}
    >
      <NodeField label="Name" value={name} onChange={onNameChange} multiline />
      <NodeSelect
        label="Type"
        value={inputType}
        onChange={(e) => { handleRemoveFile(); onTypeChange(e); }}
        options={inputTypeOptions}
      />

      {isFileMode ? (
        <>
          {/* hidden native file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED[inputType] || '*'}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {hasFile ? (
            <div className={styles.fileCard}>
              <span className={styles.fileCardIcon}>
                {TYPE_ICONS[inputType] || '📎'}
              </span>
              <div className={styles.fileCardInfo}>
                <div className={styles.fileCardName}>{data?.fileName}</div>
                <div className={styles.fileCardMeta}>{data?.fileMeta}</div>
              </div>
              <button
                className={styles.fileCardRemove}
                title="Remove file"
                onClick={handleRemoveFile}
              >✕</button>
            </div>
          ) : uploading ? (
            <div className={styles.fileUploading}>
              <span className={styles.uploadSpinner} />
              Uploading…
            </div>
          ) : (
            <div
              className={styles.fileUploadArea}
              onClick={() => fileInputRef.current?.click()}
            >
              <button className={styles.fileUploadBtn} type="button">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Choose {inputType} File
              </button>
              <p className={styles.fileUploadHint}>
                {ACCEPTED[inputType]} files only
              </p>
            </div>
          )}

          {uploadError && (
            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-error)', lineHeight: 1.4 }}>
              {uploadError}
            </p>
          )}
        </>
      ) : (
        <NodeField
          label="Value"
          value={inputValue}
          onChange={onValueChange}
          placeholder="Enter runtime value…"
          multiline
        />
      )}
    </BaseNode>
  );
};
