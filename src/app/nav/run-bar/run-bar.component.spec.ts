import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { Workout } from '../../models/workout';
import { ActiveRunService } from '../../shared/run/active-run.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import { FakeAudioContext, provideFakeAudioContext } from '../../shared/testing/fake-audio-context';
import { makeWorkout, reps, work } from '../../shared/testing/make-workout';
import { RunBarComponent } from './run-bar.component';

@Component({ template: '' })
class BlankPage {}

describe('RunBarComponent', () => {
    let fixture: ComponentFixture<RunBarComponent>;
    let element: HTMLElement;

    beforeEach(async () => {
        // A fake clock that only moves when the test advances it (Date.now included)
        vi.useFakeTimers();
        await TestBed.configureTestingModule({
            imports: [RunBarComponent],
            providers: [
                provideRouter([{ path: '**', component: BlankPage }]),
                provideFakeAudioContext(new FakeAudioContext()),
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(RunBarComponent);
        element = fixture.nativeElement;
        await go('/library');
    });

    afterEach(() => {
        fixture.destroy();
        vi.useRealTimers();
        sessionStorage.clear();
        localStorage.clear();
    });

    const bar = () => element.querySelector<HTMLElement>('aside');
    const status = () => element.querySelector('.run-bar__status')!.textContent!.trim();
    const button = () => element.querySelector<HTMLButtonElement>('.run-bar__pause');

    async function go(url: string) {
        await TestBed.inject(Router).navigateByUrl(url);
        fixture.detectChanges();
    }

    function start(workout: Workout) {
        TestBed.inject(WorkoutStore).setActiveWorkout(workout);
        fixture.detectChanges();
    }

    function advance(ms: number) {
        vi.advanceTimersByTime(ms);
        fixture.detectChanges();
    }

    it('is only there while a workout is going', () => {
        expect(bar()).toBeNull();

        start(makeWorkout({ title: 'Sprints' }));

        expect(bar()!.getAttribute('aria-label')).toBe('Workout in progress');
        expect(element.querySelector('.run-bar__title')!.textContent!.trim()).toBe('Sprints');
    });

    it('is not on the workout page itself', async () => {
        start(makeWorkout());

        await go('/workout');

        expect(bar()).toBeNull();
    });

    it('shows the step and its time, ticking down, in the step colour', () => {
        start(makeWorkout({ steps: [work(30, 'Plank')] }));
        expect(status()).toBe('Plank · 00:30');
        expect(bar()!.dataset['phase']).toBe('work');

        advance(5000);

        expect(status()).toBe('Plank · 00:25');
    });

    it('shows the reps on a rep step, and calls an unnamed step by its kind', () => {
        start(makeWorkout({ steps: [reps(20, 'Push-ups')] }));
        expect(status()).toBe('Push-ups · 20 reps');

        start(makeWorkout({ id: 'workout-2', steps: [work(10)] }));
        expect(status()).toBe('Timed · 00:10');
    });

    it('opens the workout from the rest of the bar', () => {
        start(makeWorkout());

        expect(element.querySelector('a')!.getAttribute('href')).toBe('/workout');
    });

    it('pauses and resumes the workout without leaving the page', () => {
        start(makeWorkout({ steps: [work(30, 'Plank')] }));

        button()!.click();
        fixture.detectChanges();

        expect(TestBed.inject(ActiveRunService).isPaused()).toBe(true);
        expect(button()!.getAttribute('aria-label')).toBe('Resume');
        expect(status()).toBe('Paused · Plank · 00:30');
        expect(bar()!.dataset['phase']).toBe('paused');

        button()!.click();
        fixture.detectChanges();

        expect(TestBed.inject(ActiveRunService).isPaused()).toBe(false);
        expect(button()!.getAttribute('aria-label')).toBe('Pause');
    });

    it('says when it has finished, with no Pause, and opens its summary', () => {
        start(makeWorkout({ steps: [work(3)], repeats: 1 }));

        advance(4000);

        expect(status()).toBe('Finished: see how it went');
        expect(bar()!.dataset['phase']).toBe('finished');
        expect(button()).toBeNull();
    });
});
