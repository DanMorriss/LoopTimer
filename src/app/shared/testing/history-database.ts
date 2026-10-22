import { DATABASE_NAME, openDatabase, readAll } from '../state/history-database';

/** Deletes the database, once whatever has it open lets go. */
export function clearDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DATABASE_NAME);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * The history saved in IndexedDB, newest first. Reading waits for writes already started,
 * so it sees what the store has saved so far.
 */
export async function savedHistory(): Promise<unknown[]> {
    const db = (await openDatabase())!;
    const saved = await readAll(db);
    db.close();
    return saved.sort(
        (a, b) => (b as { startedAt: number }).startedAt - (a as { startedAt: number }).startedAt
    );
}
