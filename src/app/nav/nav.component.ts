import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';
import { TimerStore } from '../shared/state/timer-store.service';

/** The pages the menu links to, in the order they're listed. */
const PAGES = [
    { path: '/home', label: 'Home', icon: 'home' },
    { path: '/setup', label: 'Create', icon: 'add_circle_outline' },
    { path: '/library', label: 'Library', icon: 'view_list' },
    { path: '/history', label: 'History', icon: 'history' },
    { path: '/settings', label: 'Settings', icon: 'settings' },
] as const;

/**
 * The header: the LoopTimer title and one menu button that opens links to every page.
 * The menu closes on a link, Escape, a click or tab outside it, or any navigation.
 */
@Component({
    selector: 'app-nav',
    imports: [MatIconModule, RouterLink, RouterLinkActive],
    templateUrl: './nav.component.html',
    styleUrl: './nav.component.scss',
    host: {
        '(document:click)': 'onDocumentClick($event)',
        '(keydown.escape)': 'closeAndFocusButton()',
    },
})
export class NavComponent {
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly menuButton = viewChild.required<ElementRef<HTMLButtonElement>>('menuButton');

    private readonly router = inject(Router);
    private readonly activeTimer = inject(TimerStore).activeTimer;
    private readonly url = toSignal(
        this.router.events.pipe(
            filter((event) => event instanceof NavigationEnd),
            map((event) => event.urlAfterRedirects)
        ),
        { initialValue: this.router.url }
    );

    protected readonly pages = PAGES;
    protected readonly open = signal(false);
    /** On the timer page, the running timer's title (if it has one); otherwise empty. */
    protected readonly timerTitle = computed(() =>
        this.url().startsWith('/timer') ? (this.activeTimer()?.title.trim() ?? '') : ''
    );

    constructor() {
        this.router.events
            .pipe(
                filter((event) => event instanceof NavigationEnd),
                takeUntilDestroyed()
            )
            .subscribe(() => this.open.set(false));
    }

    protected toggle() {
        this.open.update((open) => !open);
    }

    protected closeAndFocusButton() {
        if (!this.open()) return;
        this.open.set(false);
        this.menuButton().nativeElement.focus();
    }

    protected onDocumentClick(event: Event) {
        if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
            this.open.set(false);
        }
    }

    /** Closes the menu when keyboard focus moves somewhere outside it. */
    protected onFocusOut(event: FocusEvent) {
        const next = event.relatedTarget as Node | null;
        if (next && !this.host.nativeElement.contains(next)) {
            this.open.set(false);
        }
    }
}
