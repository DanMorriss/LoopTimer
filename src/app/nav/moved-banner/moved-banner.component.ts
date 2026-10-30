import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AddressMove, NEW_ADDRESS } from './address-move.service';

/**
 * On the old address, over every page: says the app has moved to loopworkouts.com, and what
 * to do so nothing's left behind (AddressMove). Gone once there's nothing to say.
 */
@Component({
    selector: 'app-moved-banner',
    imports: [RouterLink],
    template: `
        @if (shown()) {
            <section class="moved" aria-labelledby="moved-title">
                <h2 class="moved__title" id="moved-title">
                    Loop Workouts has moved to loopworkouts.com
                </h2>
                @switch (move.state()) {
                    @case ('guest') {
                        <p class="moved__text">
                            Your workouts and history are saved on this address only. Sign in to
                            take them with you: signing in there brings them back.
                        </p>
                    }
                    @case ('unsynced') {
                        <p class="moved__text">
                            Some of your changes haven't synced yet: check your connection. Once
                            they have, signing in there brings back everything.
                        </p>
                    }
                    @case ('ready') {
                        <p class="moved__text">
                            Nothing here would be lost now. Open loopworkouts.com in your browser
                            and add it to your Home Screen, then remove this one. If you have an
                            account, sign in there.
                        </p>
                    }
                }
                @if (move.homeScreenApp && move.state() !== 'ready') {
                    <p class="moved__text">
                        This Home Screen app stays on the old address, so after that, open
                        loopworkouts.com in your browser and add it to your Home Screen.
                    </p>
                }
                <div class="moved__actions">
                    @switch (move.state()) {
                        @case ('guest') {
                            <a class="btn-pill" routerLink="/account">Sign in</a>
                        }
                        @case ('unsynced') {
                            <button type="button" class="btn-pill" (click)="move.check()">
                                Try again
                            </button>
                        }
                    }
                    <a class="btn-pill" [href]="newAddress">Open loopworkouts.com</a>
                </div>
            </section>
        }
    `,
    styleUrl: './moved-banner.component.scss',
})
export class MovedBannerComponent {
    protected readonly move = inject(AddressMove);
    protected readonly newAddress = NEW_ADDRESS;
    protected readonly shown = computed(() =>
        ['guest', 'unsynced', 'ready'].includes(this.move.state())
    );
}
