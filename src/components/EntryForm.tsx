import { type FormEvent, useState } from 'react';
import { addEntry } from '../db';

type Props = { onAdded: () => void };

export default function EntryForm({ onAdded }: Props) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;

    setSaving(true);
    try {
      await addEntry(value);
      setMsg(navigator.onLine ? 'Guardado local (pendiente de sync).' : 'Sin conexión: guardado local.');
      setText('');
      onAdded();
    } catch (err) {
      console.error(err);
      setMsg('Error guardando la entrada.');
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 1800);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2>Reporte / Lista (offline)</h2>
      <textarea
        placeholder="Escribe una actividad o tarea..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        required
      />
      <div className="row">
        <button type="submit" disabled={saving || !text.trim()}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <span className="hint">{navigator.onLine ? 'En línea' : 'Offline'}</span>
      </div>
      {msg && <p className="msg">{msg}</p>}
    </form>
  );
}
