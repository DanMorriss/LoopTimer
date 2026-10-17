import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Timer } from '../../models/timer';
import { TimerCardComponent } from './timer-card.component';

const sprints: Timer = {
    id: 7,
    title: 'Sprints',
    timerMinutes: 1,
    timerSeconds: 5,
    restMinutes: 0,
    restSeconds: 20,
    repeats: 4,
    isTimerActive: false,
    isRestActive: false,
    isComplete: false,
};

// The card's selector is an attribute on <li>, so test it inside a list like the library does
@Component({
    imports: [TimerCardComponent],
    template: `
        <ul>
            <li
                appTimerCard
                [timer]="timer()"
                [active]="active()"
                [menuOpen]="menuOpen()"
                (selected)="events.push('selected')"
                (started)="events.push('started')"
                (menuToggled)="events.push('menuToggled')"
                (menuClosed)="events.push('menuClosed')"
                (editRequested)="events.push('editRequested')"
                (deleteRequested)="events.push('deleteRequested')"
            ></li>
        </ul>
    `,
})
class HostComponent {
    timer = signal(sprints);
    active = signal(false);
    menuOpen = signal(false);
    events: string[] = [];
}

describe('TimerCardComponent', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;

    beforeEach(() => {
        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
        fixture.detectChanges();
    });

    const card = (): HTMLElement => fixture.nativeElement.querySelector('li');
    const el = (selector: string): HTMLElement => card().querySelector(selector)!;
    const set = (changes: Partial<{ timer: Timer; active: boolean; menuOpen: boolean }>) => {
        if (changes.timer) host.timer.set(changes.timer);
        if (changes.active !== undefined) host.active.set(changes.active);
        if (changes.menuOpen !== undefined) host.menuOpen.set(changes.menuOpen);
        fixture.detectChanges();
    };

    it('is a list item showing the title and padded times', () => {
        expect(card().classList).toContain('timer-card');
        expect(el('.timer-card__title').textContent?.trim()).toBe('Sprints');
        expect(el('.timer-card__summary').textContent).toContain('01:05 - 00:20 x 4');
        expect(el('.timer-card__summary').getAttribute('aria-label')).toBe(
            'Timer 01:05, rest 00:20, repeated 4 times'
        );
    });

    it('names an untitled timer generically', () => {
        set({ timer: { ...sprints, title: '  ' } });

        expect(el('.timer-card__title').textContent?.trim()).toBe('Untitled timer');
        expect(el('.timer-card__overlay-play').getAttribute('aria-label')).toBe('Start timer');
    });

    it('shows the selected state and play button only when active with the menu closed', () => {
        expect(card().classList).not.toContain('timer-card--active');
        expect(el('.timer-card__overlay-play').classList).not.toContain(
            'timer-card__overlay-play--visible'
        );

        set({ active: true });
        expect(card().classList).toContain('timer-card--active');
        expect(el('.timer-card__overlay-play').classList).toContain(
            'timer-card__overlay-play--visible'
        );

        set({ menuOpen: true });
        expect(card().classList).toContain('timer-card--menu-open');
        expect(el('.timer-card__overlay-play').classList).not.toContain(
            'timer-card__overlay-play--visible'
        );
    });

    it('reports being selected by a click or by focusing its play button', () => {
        card().click();
        el('.timer-card__overlay-play').dispatchEvent(new FocusEvent('focus'));

        expect(host.events).toEqual(['selected', 'selected']);
    });

    it('reports start without also reporting a selection', () => {
        el('.timer-card__overlay-play').click();

        expect(host.events).toEqual(['started']);
    });

    it('toggles its options, which offer edit and delete', () => {
        el('.timer-card__action--menu').click();
        expect(host.events).toEqual(['menuToggled']);
        expect(el('.timer-card__action--menu').getAttribute('aria-expanded')).toBe('false');

        set({ menuOpen: true });
        expect(el('.timer-card__action--menu').getAttribute('aria-expanded')).toBe('true');
        el('.timer-card__menu-item--edit').click();
        el('.timer-card__menu-item--danger').click();

        expect(host.events).toEqual(['menuToggled', 'editRequested', 'deleteRequested']);
    });

    it('asks to close its options on Escape', () => {
        set({ menuOpen: true });

        el('.timer-card__menu-item--edit').dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        );

        expect(host.events).toEqual(['menuClosed']);
    });
});
