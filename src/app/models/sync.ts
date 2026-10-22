/**
 * What every saved record has so it can be merged with another copy of it, from a backup
 * now and from another device once there's sync (see docs/features/backup-and-sync.md).
 */
export interface Synced {
    /** Random, so two devices can't hand out the same one. */
    id: string;
    /** When it last changed, in ms since the epoch. The most recent change wins a merge. */
    updatedAt: number;
}

/** The kinds of record that are synced, and so leave a deletion behind. */
export type SyncedKind = 'workout' | 'history' | 'exercise' | 'exercise-note';
const SYNCED_KINDS: readonly SyncedKind[] = ['workout', 'history', 'exercise', 'exercise-note'];

/** A record that was deleted, kept so the deletion can reach other copies too. */
export interface Deletion {
    kind: SyncedKind;
    id: string;
    /** When it was deleted, in ms since the epoch. */
    deletedAt: number;
}

/** A new id for a record. */
export function newId(): string {
    return crypto.randomUUID();
}

export interface MergeResult<T> {
    /** This copy's records after the merge, in their old order with new ones at the end. */
    records: T[];
    added: number;
    updated: number;
    /** Records here that the other copy had deleted since they last changed. */
    removed: number;
    /** Deletions to keep here: the other copy's that applied, so they carry on. */
    deletions: Deletion[];
}

/**
 * Merges another copy's records into these, by id: the most recent change to each record
 * wins, and so does a deletion made after a record's last change. Nothing is removed unless
 * the other copy deleted it. `deletedHere` gives when a record was deleted here, if it was.
 */
export function mergeRecords<T extends Synced>(
    kind: SyncedKind,
    here: readonly T[],
    there: readonly T[],
    deletedHere: (id: string) => number | undefined,
    deletedThere: readonly Deletion[]
): MergeResult<T> {
    const records = [...here];
    let added = 0;
    let updated = 0;
    const seen = new Set<string>();
    for (const record of there) {
        if (seen.has(record.id)) {
            continue;
        }
        seen.add(record.id);
        const deletedAt = deletedHere(record.id);
        if (deletedAt !== undefined && deletedAt >= record.updatedAt) {
            continue;
        }
        const i = records.findIndex((existing) => existing.id === record.id);
        if (i === -1) {
            records.push(record);
            added++;
        } else if (record.updatedAt > records[i].updatedAt) {
            records[i] = record;
            updated++;
        }
    }

    let removed = 0;
    const deletions: Deletion[] = [];
    for (const deletion of deletedThere) {
        if (deletion.kind !== kind) {
            continue;
        }
        const i = records.findIndex((existing) => existing.id === deletion.id);
        if (i !== -1 && records[i].updatedAt > deletion.deletedAt) {
            // Changed here after it was deleted there: keep it
            continue;
        }
        if (i !== -1) {
            records.splice(i, 1);
            removed++;
        }
        const here = deletedHere(deletion.id);
        if (here === undefined || here < deletion.deletedAt) {
            deletions.push(deletion);
        }
    }
    return { records, added, updated, removed, deletions };
}

/** Whether a saved value is a usable deletion. */
export function isDeletion(value: unknown): value is Deletion {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const deletion = value as Record<string, unknown>;
    return (
        SYNCED_KINDS.includes(deletion['kind'] as SyncedKind) &&
        typeof deletion['id'] === 'string' &&
        deletion['id'] !== '' &&
        Number.isInteger(deletion['deletedAt']) &&
        (deletion['deletedAt'] as number) > 0
    );
}
