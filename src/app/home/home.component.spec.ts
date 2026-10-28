import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HistoryEntry, LoggedSet } from '../models/history';
import { HistoryStore } from '../shared/state/history-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { HomeComponent } from './home.component';

const NOW = new Date(2026, 9, 18, 12, 0).getTime();
const HOUR = 60 * 60 * 1000;

const squat: LoggedSet = {
    round: 0,
    step: 0,
    name: 'Back squat',
    reps: 5,
    exerciseId: 'builtin:back-squat',
};

const entry: HistoryEntry = {
    id: 'run-1',
    workoutId: 'workout-1',
    title: 'Legs',
    startedAt: NOW - HOUR,
    endedAt: NOW - HOUR + 600_000,
    updatedAt: NOW - HOUR + 600_000,
    activeSeconds: 600,
    roundsCompleted: 2,
    totalRounds: 2,
    outcome: 'finished',
    sets: [squat, { ...squat, round: 1 }],
};

describe('HomeComponent', () => {
    let fixture: ComponentFixture<HomeComponent>;

    beforeEach(() => {
        vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
        localStorage.clear();
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
    });

    afterEach(() => {
        fixture?.destroy();
        vi.useRealTimers();
        localStorage.clear();
    });

    function create() {
        fixture = TestBed.createComponent(HomeComponent);
        fixture.detectChanges();
    }

    const element = () => fixture.nativeElement as HTMLElement;
    const text = (selector: string) =>
        Array.from(element().querySelectorAll<HTMLElement>(selector)).map((el) =>
            el.textContent!.replace(/\s+/g, ' ').trim()
        );

    it('shows the logo, and before any workout a way to the library', () => {
        create();

        expect(element().querySelector('app-loop-logo')).not.toBeNull();
        expect(element().querySelector('.home__empty a')!.getAttribute('href')).toBe('/library');
        expect(element().querySelector('app-muscles-this-week')).toBeNull();
    });

    it('shows the logo, then the suggested next workout, then the muscles worked this week', () => {
        const workouts = TestBed.inject(WorkoutStore);
        workouts.addWorkout({
            title: 'Push',
            repeats: 3,
            steps: [
                { kind: 'reps', reps: 5, name: 'Bench press', exerciseId: 'builtin:bench-press' },
            ],
        });
        TestBed.inject(HistoryStore).record(entry);
        create();

        expect(text('.suggestion__title')).toEqual(['Push']);
        expect(text('.muscles-week__title')).toEqual(['Muscles worked this week']);
        expect(element().querySelector('.home__empty')).toBeNull();
        const order = [
            ...element().querySelectorAll('app-loop-logo, .suggestion, .muscles-week'),
        ].map((el) => el.className || el.tagName.toLowerCase());
        expect(order).toEqual(['home__logo', 'suggestion', 'muscles-week']);
    });
});
