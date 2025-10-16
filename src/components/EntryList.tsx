import { useEffect, useState } from 'react';
import { type Entry, listEntries, clearEntries } from '../db';

export default function EntryList() {
  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const data = await listEntries();
    setItems(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <section className="card">
      <div className="row">
        <h2>Registros almacenados (DB)</h2>
        <button onClick={async () => { await clearEntries(); await load(); }}>
          Borrar todo
        </button>
      </div>

      {loading && <p>Cargando…</p>}
      {!loading && items.length === 0 && <p>No hay registros aún.</p>}

      <ul className="list">
        {items.map((e) => (
          <li key={e.id}>
            <div className="meta">
              <span className={`badge ${e.status}`}>{e.status}</span>
              <time>{new Date(e.createdAt).toLocaleString()}</time>
            </div>
            <p>{e.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
