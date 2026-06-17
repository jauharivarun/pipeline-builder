import { BaseNode } from '../components/nodes/BaseNode';
import { NodeField } from '../components/nodes/NodeField';
import { NodeSelect } from '../components/nodes/NodeSelect';
import { DatabaseIcon } from '../components/nodes/icons';
import { useNodeData } from '../hooks/useNodeData';
import styles from '../styles/nodes.module.css';

const operationOptions = [
  { value: 'SELECT', label: 'SELECT — query rows' },
  { value: 'INSERT', label: 'INSERT — store data' },
  { value: 'UPDATE', label: 'UPDATE — run SQL' },
  { value: 'DELETE', label: 'DELETE — run SQL' },
];

export const DatabaseNode = ({ id, data, selected }) => {
  const [operation, , onOperationChange] = useNodeData(id, 'operation', data?.operation || 'SELECT');
  const [table,     , onTableChange]     = useNodeData(id, 'table',     data?.table     || '');
  const [query,     , onQueryChange]     = useNodeData(id, 'query',     data?.query     || '');

  const needsData  = operation === 'INSERT';
  const needsQuery = operation !== 'INSERT';

  return (
    <BaseNode
      id={id}
      title="Database (SQLite)"
      icon={<DatabaseIcon />}
      selected={selected}
      handles={[
        needsData
          ? { type: 'target', position: 'left', id: 'data',   label: 'data'   }
          : { type: 'target', position: 'left', id: 'params', label: 'params' },
        { type: 'source', position: 'right', id: 'result' },
      ]}
    >
      <NodeSelect label="Operation" value={operation} onChange={onOperationChange} options={operationOptions} />
      <NodeField label="Table name" value={table} onChange={onTableChange} placeholder="my_table" multiline />

      {needsQuery && (
        <NodeField
          label="SQL Query (leave empty for SELECT *)"
          value={query}
          onChange={onQueryChange}
          placeholder={`SELECT * FROM "${table || 'my_table'}" LIMIT 20`}
          multiline
        />
      )}

      {needsData && (
        <p className={styles.description}>
          Connect an Excel / CSV Input node to the data handle to insert rows.
        </p>
      )}

      <p className={styles.description}>
        Uses a local SQLite file (pipeline.db) in the backend folder.
      </p>
    </BaseNode>
  );
};
