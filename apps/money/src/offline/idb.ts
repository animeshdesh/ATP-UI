/** Minimal promise wrapper over one IndexedDB object store. */
const DB_NAME = 'atp-offline';
const STORE = 'outbox';

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'key' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function run<T>(
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const idbStore = {
  getAll: <T>() => run<T[]>('readonly', (s) => s.getAll() as IDBRequest<T[]>),
  put: <T>(value: T) => run('readwrite', (s) => s.put(value)),
  delete: (key: string) => run('readwrite', (s) => s.delete(key)),
  clear: () => run('readwrite', (s) => s.clear()),
};

/** Test hook: drop the cached connection so a fresh database can be opened. */
export function closeIdb() {
  void dbPromise?.then((db) => db.close());
  dbPromise = null;
}
