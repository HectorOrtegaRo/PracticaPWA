import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface Entry {
  id?: number;
  text: string;
  createdAt: number;
  status: 'pending' | 'synced';
}

interface PwaDB extends DBSchema {
  entries: {
    key: number;
    value: Entry;
    indexes: { 'by-status': Entry['status'] };
  };
}

let _db: IDBPDatabase<PwaDB> | null = null;

export async function getDB() {
  if (_db) return _db;
  _db = await openDB<PwaDB>('pwa-db', 1, {
    upgrade(db) {
      const store = db.createObjectStore('entries', {
        keyPath: 'id',
        autoIncrement: true,
      });
      store.createIndex('by-status', 'status');
    },
  });
  return _db;
}

export async function addEntry(text: string) {
  const db = await getDB();
  const entry: Entry = {
    text,
    createdAt: Date.now(),
    status: 'pending',
  };
  const id = await db.add('entries', entry);
  return { ...entry, id };
}

export async function listEntries(): Promise<Entry[]> {
  const db = await getDB();
  const all = await db.getAll('entries');
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function clearEntries() {
  const db = await getDB();
  await db.clear('entries');
}
