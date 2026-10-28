import { Provider, signal } from '@angular/core';
import type { ServerRecord } from '../../sync/sync-records';
import { SyncStarter, SyncStatus } from '../../sync/sync-starter.service';

/**
 * A stand-in for the server's records and its sync functions (supabase/schema.sql), for
 * `fakeAccountClient().rpc`: it keeps what's sent if it's newer, a deletion winning a tie,
 * takes a date more than a minute ahead as now, and gives what's been written since a seq.
 */
export function fakeSyncServer(now = 1_800_000_000_000) {
    let seq = 0;
    const records = new Map<string, ServerRecord & { seq: number }>();
    const server = {
        /** The server's clock. */
        now,
        records,
        /** Writes a record as if another device had sent it. */
        write(record: Omit<ServerRecord, 'version'> & { version?: number }) {
            server.push([{ version: 7, ...record }]);
        },
        push(changes: readonly ServerRecord[]) {
            for (const change of changes) {
                const ahead = (at: number | null) =>
                    at !== null && at > server.now + 60_000 ? server.now : at;
                const record = {
                    ...change,
                    updated_at: ahead(change.updated_at)!,
                    deleted_at: ahead(change.deleted_at),
                    data: change.deleted_at === null ? change.data : null,
                };
                const key = `${record.kind}:${record.id}`;
                const there = records.get(key);
                if (
                    !there ||
                    record.updated_at > there.updated_at ||
                    (record.updated_at === there.updated_at &&
                        record.deleted_at !== null &&
                        there.deleted_at === null)
                ) {
                    records.set(key, { ...structuredClone(record), seq: ++seq });
                }
            }
            return server.now;
        },
        pull(after: number, pageSize: number) {
            return {
                now: server.now,
                records: [...records.values()]
                    .filter((record) => record.seq > after)
                    .sort((a, b) => a.seq - b.seq)
                    .slice(0, pageSize)
                    .map((record) => structuredClone(record)),
            };
        },
        /** In place of the client's `rpc()`. */
        async rpc(fn: string, args?: unknown) {
            const params = args as Record<string, unknown>;
            if (fn === 'pull_records') {
                return {
                    data: server.pull(params['after'] as number, params['page_size'] as number),
                    error: null as unknown,
                };
            }
            if (fn === 'push_records') {
                return {
                    data: server.push(params['changes'] as ServerRecord[]),
                    error: null as unknown,
                };
            }
            return { data: null as unknown, error: null as unknown };
        },
    };
    return server;
}

export type FakeSyncServer = ReturnType<typeof fakeSyncServer>;

/** A stand-in for SyncStarter that doesn't load sync, with a status tests can set. */
export function fakeSyncStarter(status: Partial<SyncStatus> = {}) {
    return {
        start: vi.fn(),
        startIfSignedIn: vi.fn(),
        status: signal<SyncStatus>({
            syncing: false,
            lastSyncedAt: null,
            problem: null,
            ...status,
        }),
    };
}

export type FakeSyncStarter = ReturnType<typeof fakeSyncStarter>;

/** Provides `starter` in place of SyncStarter. */
export function provideFakeSyncStarter(starter = fakeSyncStarter()): Provider {
    return { provide: SyncStarter, useValue: starter };
}
