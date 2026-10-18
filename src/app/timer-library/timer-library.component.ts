import {
    afterNextRender,
    Component,
    computed,
    ElementRef,
    inject,
    Injector,
    signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Timer } from '../models/timer';
import { InfinityButtonComponent } from '../shared/components/infinity-button/infinity-button.component';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog/confirm-dialog.component';
import { TimerCardComponent } from './timer-card/timer-card.component';
import { TimerStore } from '../shared/state/timer-store.service';

@Component({
    selector: 'app-timer-library',
    templateUrl: './timer-library.component.html',
    styleUrl: './timer-library.component.scss',
    imports: [
        ConfirmDialogComponent,
        TimerCardComponent,
        MatButtonModule,
        MatIconModule,
        InfinityButtonComponent,
    ],
})
export class TimerLibraryComponent {
    timerStore = inject(TimerStore);
    router = inject(Router);
    private host = inject<ElementRef<HTMLElement>>(ElementRef);
    private injector = inject(Injector);
    protected timerPendingDelete = signal<Timer | null>(null);
    protected activeTimerCardId = signal<number | null>(null);
    protected openTimerMenuId = signal<number | null>(null);

    protected isExistingTimers = computed(() => this.timerStore.timers().length > 0);

    requestDelete(timer: Timer) {
        this.activeTimerCardId.set(null);
        this.openTimerMenuId.set(null);
        this.timerPendingDelete.set(timer);
    }

    cancelDelete() {
        const timer = this.timerPendingDelete();
        this.timerPendingDelete.set(null);
        if (timer) {
            this.focusAfterRender(`[data-menu-for="${timer.id}"]`);
        }
    }

    confirmDelete() {
        const timer = this.timerPendingDelete();
        if (!timer) {
            return;
        }

        this.timerStore.deleteTimer(timer.id);
        this.timerPendingDelete.set(null);
        this.activeTimerCardId.set(null);
        this.openTimerMenuId.set(null);
        this.focusAfterRender('.library-add-button');
    }

    setActiveTimerCard(timerId: number) {
        this.activeTimerCardId.set(timerId);
    }

    clearActiveTimerCard() {
        this.activeTimerCardId.set(null);
        this.openTimerMenuId.set(null);
    }

    toggleTimerMenu(timerId: number) {
        this.activeTimerCardId.set(timerId);
        this.openTimerMenuId.update((currentMenuId) =>
            currentMenuId === timerId ? null : timerId
        );
    }

    closeTimerMenu(timerId: number) {
        if (this.openTimerMenuId() !== timerId) {
            return;
        }
        this.openTimerMenuId.set(null);
        this.focusAfterRender(`[data-menu-for="${timerId}"]`);
    }

    // The element that had focus is removed when a menu or dialog closes,
    // so move focus somewhere sensible instead of losing it to the page
    private focusAfterRender(selector: string) {
        afterNextRender(
            () => {
                this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus();
            },
            { injector: this.injector }
        );
    }

    startTimer(timer: Timer) {
        this.timerStore.setActiveTimer(timer);
        this.router.navigate(['/timer']);
    }

    navigateToCreateTimer() {
        this.router.navigate(['/setup']);
    }

    navigateToEditTimer(timerId: number) {
        this.openTimerMenuId.set(null);
        this.activeTimerCardId.set(null);
        this.router.navigate(['/setup'], { queryParams: { editId: timerId } });
    }
}
