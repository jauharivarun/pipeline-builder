import { useState } from 'react';
import { DraggableNode } from './draggableNode';
import { getPaletteNodesByCategory } from './config/nodeRegistry';
import styles from './styles/toolbar.module.css';

const TABS = [
  { id: 'core',  label: 'Core'  },
  { id: 'tools', label: 'Tools' },
];

export const PipelineToolbar = () => {
  const [activeTab, setActiveTab] = useState('core');
  const { core, tools } = getPaletteNodesByCategory();
  const nodesByTab = { core, tools };
  const activeNodes = nodesByTab[activeTab] || [];

  return (
    <div className={styles.toolbar}>
      <div className={styles.tabBar} role="tablist" aria-label="Node categories">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            className={`${styles.tab} ${activeTab === id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(id)}
          >
            {label}
            <span className={styles.tabCount}>{nodesByTab[id]?.length ?? 0}</span>
          </button>
        ))}
      </div>

      <div className={styles.palette} role="tabpanel">
        {activeNodes.map(({ type, label, icon }) => (
          <DraggableNode key={type} type={type} label={label} icon={icon} />
        ))}
      </div>
    </div>
  );
};
