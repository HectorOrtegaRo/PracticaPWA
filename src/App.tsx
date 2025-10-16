import { useState } from 'react';
import OfflineBanner from './components/OfflineBanner';
import EntryForm from './components/EntryForm';
import EntryList from './components/EntryList';
import './index.css'; 

export default function App() {
  const [reload, setReload] = useState(0);

  return (
    <>
      <OfflineBanner />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '20px' }}>
        <h1>My PWA — Héctor Ortega</h1>
        <p>Hola profe </p>

        <EntryForm onAdded={() => setReload((x) => x + 1)} />

        <div key={reload}>
          <EntryList />
        </div>
      </main>
    </>
  );
}
