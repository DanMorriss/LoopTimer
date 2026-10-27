// The history lives in IndexedDB, which has room for years of it where localStorage
// (about 5 MB) doesn't. Each call settles rather than throwing, so a browser without
// IndexedDB (or a failed write) leaves the history store to keep things in localStorage.

export const DATABASE_NAME = 'loop-workouts';
export const HISTORY_STORE = 'history';
const DATABASE_VERSION = 1;

/** Opens the database, or gives null if this browser can't. */
export function openDatabase(): Promise<IDBDatabase | null> {
    return new Promise((resolve) => {
        let request: IDBOpenDBRequest;
        try {
            request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
        } catch {
            resolve(null);
            return;
        }
        request.onupgradeneeded = () => {
            request.result.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
        };
        request.onsuccess = () => {
            const db = request.result;
            // Let a newer version in another tab (or a test clearing it) take over
            db.onversionchange = () => db.close();
            resolve(db);
        };
        request.onerror = () => resolve(null);
    });
}

/** Everything saved, unchecked; nothing if it can't be read. */
export function readAll(db: IDBDatabase): Promise<unknown[]> {
    return new Promise((resolve) => {
        try {
            const request = db.transaction(HISTORY_STORE).objectStore(HISTORY_STORE).getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve([]);
        } catch {
            resolve([]);
        }
    });
}

/** Saves `put` and removes `remove` (by id) together, giving whether that's done. */
export function write(
    db: IDBDatabase,
    put: readonly object[],
    remove: readonly string[] = []
): Promise<boolean> {
    return new Promise((resolve) => {
        try {
            const transaction = db.transaction(HISTORY_STORE, 'readwrite');
            const store = transaction.objectStore(HISTORY_STORE);
            put.forEach((record) => store.put(record));
            remove.forEach((id) => store.delete(id));
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => resolve(false);
            transaction.onabort = () => resolve(false);
        } catch {
            // e.g. the database was closed for a newer version
            resolve(false);
        }
    });
}
