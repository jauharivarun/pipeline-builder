import { PipelineToolbar } from './toolbar';
import { PipelineUI } from './ui';
import { SubmitButton } from './submit';
import styles from './styles/app.module.css';

function App() {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>Pipeline Builder</h1>
          <p className={styles.headerSubtitle}>
            Drag nodes from the palette onto the canvas to build your workflow
          </p>
        </div>
      </header>
      <main className={styles.main}>
        <PipelineToolbar />
        <PipelineUI />
        <SubmitButton />
      </main>
      <footer className={styles.footer}>
        <p className={styles.hint}>
          Select a connection and press <kbd>Delete</kbd> or <kbd>Backspace</kbd> to remove it
        </p>
      </footer>
    </div>
  );
}

export default App;
