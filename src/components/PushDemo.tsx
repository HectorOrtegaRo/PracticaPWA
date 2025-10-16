import { useEffect, useState } from 'react';
import {
  requestNotificationPermission,
  subscribeUser,
  getExistingSubscription,
  unsubscribeUser,
} from '../push';

export default function PushDemo() {
  const [permission, setPermission] = useState<NotificationPermission>(Notification.permission);
  const [subJSON, setSubJSON] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    (async () => {
      const sub = await getExistingSubscription();
      if (sub) setSubJSON(JSON.stringify(sub, null, 2));
    })();
  }, []);

  async function enable() {
    try {
      await requestNotificationPermission();
      setPermission('granted');
      setStatus('Permiso concedido ✅');
    } catch (e: any) {
      setStatus(e.message || 'No se concedió permiso');
    }
  }

  async function subscribe() {
    try {
      const sub = await subscribeUser();
      setSubJSON(JSON.stringify(sub, null, 2));
      setStatus('Suscripción creada ✅ (cópiala para usarla en la herramienta de prueba)');
    } catch (e: any) {
      setStatus(e.message || 'Error al suscribir');
    }
  }

  async function unsubscribe() {
    const ok = await unsubscribeUser();
    setStatus(ok ? 'Suscripción cancelada' : 'No había suscripción');
    if (ok) setSubJSON('');
  }

  async function localTestNotification() {
    // NOTA: esto NO es push; es una notificación local para comprobar permisos
    if (permission !== 'granted') return setStatus('Primero concede permiso');
    new Notification('Notificación local', {
      body: 'Esto verifica que tienes permiso, no es push.',
      icon: '/icons/icon-192.png',
    });
  }

  function copy() {
    if (!subJSON) return;
    navigator.clipboard.writeText(subJSON);
    setStatus('Suscripción copiada al portapapeles 📋');
  }

  return (
    <section className="card">
      <h2>Notificaciones Push (demo)</h2>
      <p>1) Concede permiso. 2) Suscribirse. 3) Copia el JSON y envía una prueba con el script o una herramienta de Web Push.</p>

      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button onClick={enable} disabled={permission === 'granted'}>Conceder permiso</button>
        <button onClick={subscribe}>Suscribirme a Push</button>
        <button onClick={unsubscribe}>Cancelar suscripción</button>
        <button onClick={localTestNotification}>Notificación local</button>
        <button onClick={copy} disabled={!subJSON}>Copiar suscripción</button>
      </div>

      <p className="hint">Permiso: <b>{permission}</b></p>
      {status && <p className="msg">{status}</p>}

      <pre style={{ whiteSpace: 'pre-wrap', background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e5e7eb', maxHeight: 260, overflow: 'auto' }}>
        {subJSON || 'Sin suscripción'}
      </pre>
    </section>
  );
}
