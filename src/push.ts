import { VAPID_PUBLIC_KEY } from './pushConfig';

function base64UrlToUint8Array(base64Url: string) {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

export async function ensureSW(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) throw new Error('SW no soportado');
  return navigator.serviceWorker.ready;
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) throw new Error('Notifications no soportadas');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Permiso denegado');
  return perm;
}

export async function subscribeUser(): Promise<PushSubscription> {
  const reg = await ensureSW();
  const key = base64UrlToUint8Array(VAPID_PUBLIC_KEY);
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: key,
  });
  return sub;
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  const reg = await ensureSW();
  return reg.pushManager.getSubscription();
}

export async function unsubscribeUser(): Promise<boolean> {
  const sub = await getExistingSubscription();
  if (sub) return sub.unsubscribe();
  return false;
}
