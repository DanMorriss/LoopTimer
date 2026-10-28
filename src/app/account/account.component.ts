import { Component } from '@angular/core';
import { ClearDeviceComponent } from '../shared/components/clear-device/clear-device.component';

/**
 * The Account tab (SYN-3, SYN-8, SYN-9): signing in to sync, and what's on this device.
 * Signing in comes next; for now it says what an account will do, and offers Clear this device.
 */
@Component({
    selector: 'app-account',
    imports: [ClearDeviceComponent],
    template: `
        <div class="flex justify-center">
            <div
                class="m-4 w-full max-w-md rounded-xl border border-(--panel-border) bg-(--panel) p-6 shadow-xl shadow-(color:--shadow)"
            >
                <h2 class="account__title">Account</h2>

                <section class="account__section" aria-labelledby="sync-heading">
                    <h3 class="account__heading" id="sync-heading">Sync</h3>
                    <p class="account__hint">
                        Soon you'll be able to sign in, so your workouts and history are the same on
                        your phone and your laptop. An account will be optional: without one,
                        everything stays on this device, as it does now.
                    </p>
                </section>

                <section class="account__section" aria-labelledby="device-heading">
                    <h3 class="account__heading" id="device-heading">This device</h3>
                    <p class="account__hint">
                        Your workouts, history and settings are saved in this browser. Done with it,
                        on a shared computer say? Clear them from it.
                    </p>
                    <app-clear-device class="account__clear" />
                </section>
            </div>
        </div>
    `,
    styleUrl: './account.component.scss',
})
export class AccountComponent {}
