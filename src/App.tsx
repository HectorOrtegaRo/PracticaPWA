import { useEffect, useState } from 'react';
import OfflineBanner from './components/OfflineBanner';
import EntryForm from './components/EntryForm';
import EntryList from './components/EntryList';
import './index.css';
import PushDemo from './components/PushDemo';

export default function App() {
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMsg = (ev: MessageEvent) => {
      if (ev.data?.type === 'synced') {
        setReload((x) => x + 1);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMsg as any);
    return () => navigator.serviceWorker.removeEventListener('message', onMsg as any);
  }, []);

  useEffect(() => {
    const onOnline = () => {
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage('try-sync-now');
      }
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  return (
    <>
      <OfflineBanner />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '20px' }}>
        <h1>My PWA — Hector Ortega</h1>
        <p>Guardado de entradas sin conexión. Se listan desde IndexedDB al recargar.</p>

        <EntryForm onAdded={() => setReload((x) => x + 1)} />

        <div key={reload}>
          <EntryList />
        </div>

        <div style={{ marginTop: 16 }}>
          <PushDemo />
        </div>
      </main>
    </>
  );
}
