import { Service } from '@angular/core';
import { Deletion, isDeletion, SyncedKind } from '../../models/sync';
import { migrateSavedData } from './migrate';

const STORAGE_KEY = 'deleted';

/** Plenty to carry deletions to another copy, without letting storage grow forever. */
export const MAX_DELETIONS = 500;

/**
 * Records that were deleted, saved in the browser, so a deletion reaches other copies of the
 * data (a backup now, other devices later) and a deleted record can't come back by itself.
 */
@Service()
export class DeletionStore {
    /** Oldest first. */
    private deletions = loadDeletions();

    /** When a record was deleted, or undefined if it hasn't been. */
    deletedAt(kind: SyncedKind, id: string): number | undefined {
        return this.deletions.find((d) => d.kind === kind && d.id === id)?.deletedAt;
    }

    all(): readonly Deletion[] {
        return this.deletions;
    }

    /** Remembers a deletion, replacing any older one of the same record. */
    add(deletion: Deletion) {
        const others = this.deletions.filter(
            (d) => !(d.kind === deletion.kind && d.id === deletion.id)
        );
        this.save([...others, deletion].slice(-MAX_DELETIONS));
    }

    /** Forgets a deletion, e.g. on Undo. */
    remove(kind: SyncedKind, id: string) {
        this.save(this.deletions.filter((d) => !(d.kind === kind && d.id === id)));
    }

    private save(deletions: Deletion[]) {
        this.deletions = deletions;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(deletions));
    }
}

function loadDeletions(): Deletion[] {
    migrateSavedData();
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
        return Array.isArray(parsed) ? parsed.filter(isDeletion) : [];
    } catch {
        return [];
    }
}
