import styles from '../../styles/nodes.module.css';

export const NodeSelect = ({ label, value, onChange, options }) => (
  <label className={styles.field}>
    <span className={styles.label}>{label}</span>
    <select className={styles.select} value={value} onChange={onChange}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);
