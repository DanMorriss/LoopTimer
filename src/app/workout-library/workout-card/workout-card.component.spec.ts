import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Workout, UNTIL_STOPPED } from '../../models/workout';
import { makeWorkout, reps, rest, work } from '../../shared/testing/make-workout';
import { WorkoutCardComponent } from './workout-card.component';

const sprints = makeWorkout({
    id: 'workout-7',
    title: 'Sprints',
    workMinutes: 1,
    workSeconds: 5,
    restSeconds: 20,
    repeats: 4,
});

// The card's selector is an attribute on <li>, so test it inside a list like the library does
@Component({
    imports: [WorkoutCardComponent],
    template: `
        <ul>
            <li
                appWorkoutCard
                [workout]="workout()"
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
    workout = signal(sprints);
    active = signal(false);
    menuOpen = signal(false);
    events: string[] = [];
}

describe('WorkoutCardComponent', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;

    beforeEach(() => {
        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
        fixture.detectChanges();
    });

    const card = (): HTMLElement => fixture.nativeElement.querySelector('li');
    const el = (selector: string): HTMLElement => card().querySelector(selector)!;
    const set = (changes: Partial<{ workout: Workout; active: boolean; menuOpen: boolean }>) => {
        if (changes.workout) host.workout.set(changes.workout);
        if (changes.active !== undefined) host.active.set(changes.active);
        if (changes.menuOpen !== undefined) host.menuOpen.set(changes.menuOpen);
        fixture.detectChanges();
    };

    it('is a list item showing the title and padded times', () => {
        expect(card().classList).toContain('workout-card');
        expect(el('.workout-card__title').textContent?.trim()).toBe('Sprints');
        expect(el('.workout-card__summary').textContent).toContain('01:05 - 00:20 x 4');
        expect(el('.workout-card__summary').getAttribute('aria-label')).toBe(
            'Timed 01:05, rest 00:20, repeated 4 times'
        );
    });

    it('shows ∞ for a workout that runs until stopped', () => {
        set({ workout: { ...sprints, repeats: UNTIL_STOPPED } });

        expect(el('.workout-card__summary').textContent).toContain('01:05 - 00:20 x ∞');
        expect(el('.workout-card__summary').getAttribute('aria-label')).toBe(
            'Timed 01:05, rest 00:20, repeated until stopped'
        );
    });

    it('sums up an unnamed round of several steps by their count and total time', () => {
        set({ workout: { ...sprints, steps: [work(30), work(45), rest(20)] } });

        expect(el('.workout-card__summary').textContent).toContain('3 steps · 01:35 x 4');
        expect(el('.workout-card__summary').getAttribute('aria-label')).toBe(
            '3 steps, 01:35 a round, repeated 4 times'
        );
    });

    it('adds "+ reps" to the time of an unnamed round with rep steps', () => {
        set({ workout: { ...sprints, steps: [work(30), reps(20), rest(20)] } });

        expect(el('.workout-card__summary').textContent).toContain('3 steps · 00:50 + reps x 4');
        expect(el('.workout-card__summary').getAttribute('aria-label')).toBe(
            '3 steps, 00:50 a round plus reps, repeated 4 times'
        );
    });

    it('lists the named exercises in the round when the workout has them', () => {
        set({
            workout: {
                ...sprints,
                steps: [work(30, 'Squats'), reps(20, 'Bench press'), work(25, 'Deadlifts'), rest(20)],
            },
        });

        expect(el('.workout-card__summary').textContent).toContain('Squats, Bench press + 1 more x 4');
        expect(el('.workout-card__summary').getAttribute('aria-label')).toBe(
            'Squats, Bench press + 1 more, repeated 4 times'
        );
    });

    it('says "reps" alone for a round with no timed steps', () => {
        set({ workout: { ...sprints, steps: [reps(10)] } });

        expect(el('.workout-card__summary').textContent).toContain('1 step · reps x 4');
        expect(el('.workout-card__summary').getAttribute('aria-label')).toBe(
            '1 step, all reps, repeated 4 times'
        );
    });

    it('shows a workout with no rest as rest 00:00, as before', () => {
        set({ workout: { ...sprints, steps: [work(65)] } });

        expect(el('.workout-card__summary').textContent).toContain('01:05 - 00:00 x 4');
    });

    it('names an untitled workout generically', () => {
        set({ workout: { ...sprints, title: '  ' } });

        expect(el('.workout-card__title').textContent?.trim()).toBe('Untitled workout');
        expect(el('.workout-card__overlay-play').getAttribute('aria-label')).toBe('Start workout');
    });

    it('shows the selected state and play button only when active with the menu closed', () => {
        expect(card().classList).not.toContain('workout-card--active');
        expect(el('.workout-card__overlay-play').classList).not.toContain(
            'workout-card__overlay-play--visible'
        );

        set({ active: true });
        expect(card().classList).toContain('workout-card--active');
        expect(el('.workout-card__overlay-play').classList).toContain(
            'workout-card__overlay-play--visible'
        );

        set({ menuOpen: true });
        expect(card().classList).toContain('workout-card--menu-open');
        expect(el('.workout-card__overlay-play').classList).not.toContain(
            'workout-card__overlay-play--visible'
        );
    });

    it('reports being selected by a click or by focusing its play button', () => {
        card().click();
        el('.workout-card__overlay-play').dispatchEvent(new FocusEvent('focus'));

        expect(host.events).toEqual(['selected', 'selected']);
    });

    it('reports start without also reporting a selection', () => {
        el('.workout-card__overlay-play').click();

        expect(host.events).toEqual(['started']);
    });

    it('toggles its options, which offer edit and delete', () => {
        el('.workout-card__action--menu').click();
        expect(host.events).toEqual(['menuToggled']);
        expect(el('.workout-card__action--menu').getAttribute('aria-expanded')).toBe('false');

        set({ menuOpen: true });
        expect(el('.workout-card__action--menu').getAttribute('aria-expanded')).toBe('true');
        el('.workout-card__menu-item--edit').click();
        el('.workout-card__menu-item--danger').click();

        expect(host.events).toEqual(['menuToggled', 'editRequested', 'deleteRequested']);
    });

    it('asks to close its options on Escape', () => {
        set({ menuOpen: true });

        el('.workout-card__menu-item--edit').dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        );

        expect(host.events).toEqual(['menuClosed']);
    });
});
