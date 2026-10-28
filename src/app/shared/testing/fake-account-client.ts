import { Provider } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import { AccountClient, ACCOUNT_CLIENT } from '../../account/account-client';

/** A session for `email`, as much of one as the app reads. */
export function sessionFor(email: string): Session {
    return { user: { email } } as Session;
}

/**
 * A stand-in for Supabase's client, signed in as `email` (or signed out). Signing in with a
 * code and signing out tell its listener, as the real one does. Each call is a spy, so tests
 * can change what it answers.
 */
export function fakeAccountClient(email: string | null = null) {
    let session = email === null ? null : sessionFor(email);
    let listener: ((event: string, session: Session | null) => void) | null = null;
    const change = (next: Session | null) => {
        session = next;
        listener?.(next ? 'SIGNED_IN' : 'SIGNED_OUT', next);
    };
    const auth = {
        onAuthStateChange: vi.fn((callback: typeof listener) => {
            listener = callback;
            return { data: { subscription: { unsubscribe: () => (listener = null) } } };
        }),
        getSession: vi.fn(async () => ({ data: { session }, error: null })),
        signInWithOtp: vi.fn(async (_credentials: unknown) => ({
            data: {},
            error: null as unknown,
        })),
        verifyOtp: vi.fn(async ({ email: address }: { email: string; token: string }) => {
            change(sessionFor(address));
            return { data: {}, error: null as unknown };
        }),
        signOut: vi.fn(async (_options?: unknown) => {
            change(null);
            return { error: null as unknown };
        }),
    };
    const rpc = vi.fn(async (_fn: string) => ({ data: null, error: null as unknown }));
    return { auth, rpc, change };
}

export type FakeAccountClient = ReturnType<typeof fakeAccountClient>;

/** Provides `client` in place of Supabase's. */
export function provideFakeAccountClient(client: FakeAccountClient): Provider {
    return {
        provide: ACCOUNT_CLIENT,
        useValue: () => Promise.resolve(client as unknown as AccountClient),
    };
}
