import { InjectionToken } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Loop Workouts' Supabase project, in Europe. The publishable key is meant to be in the app:
 * what each account can reach is set on the server (row-level security, in
 * supabase/schema.sql). The secret key never goes in the app.
 */
export const SUPABASE_URL = 'https://cpgacyzlfyskifzhkotu.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_YnL-skDr7iSBsqSqaIbWBg_vE-kGXQa';

/** The parts of the Supabase client accounts use. */
export type AccountClient = Pick<SupabaseClient, 'auth' | 'rpc'>;

/**
 * Makes the Supabase client, loading its code only when it's first needed (the Account tab),
 * so it stays out of the app's first load. Tests provide a fake.
 */
export const ACCOUNT_CLIENT = new InjectionToken<() => Promise<AccountClient>>('ACCOUNT_CLIENT', {
    providedIn: 'root',
    factory: () => () =>
        import('@supabase/supabase-js').then(({ createClient }) =>
            createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
                auth: {
                    // The link's tokens come back in the address, so a link opened in another
                    // browser on the device signs that browser in (the code is for the Home
                    // Screen app, which keeps its storage apart from Safari's)
                    flowType: 'implicit',
                    detectSessionInUrl: true,
                    persistSession: true,
                    autoRefreshToken: true,
                },
            })
        ),
});
