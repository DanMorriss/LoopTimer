import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HistoryEntry } from './models/history';
import { routes } from './app.routes';

const entry: HistoryEntry = {
    id: '1000000-1',
    workoutId: 'workout-1',
    title: 'Sprints',
    startedAt: 1_000_000,
    endedAt: 1_060_000,
    updatedAt: 1_060_000,
    activeSeconds: 60,
    roundsCompleted: 3,
    totalRounds: 3,
    outcome: 'finished',
};

describe('routes', () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('data-version', '4');
        TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    });
    afterEach(() => localStorage.clear());

    // It loads in the background, so the page would otherwise say there's nothing yet
    it('opens the history once the saved history has loaded', async () => {
        localStorage.setItem('history', JSON.stringify([entry]));
        const harness = await RouterTestingHarness.create();

        await harness.navigateByUrl('/history');

        expect(harness.routeNativeElement!.textContent).toContain('Sprints');
        expect(harness.routeNativeElement!.textContent).not.toContain('No workouts yet');
    });
});
