import { TestBed } from '@angular/core/testing';
import { HistoryEntry } from '../../models/history';
import { makeWorkout } from '../testing/make-workout';
import { savedHistory } from '../testing/history-database';
import { DeviceDataService } from './device-data.service';
import { HistoryStore } from './history-store.service';
import { WorkoutStore } from './workout-store.service';

const ENTRY: HistoryEntry = {
    id: '1000000-workout-1',
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

describe('DeviceDataService', () => {
    let reload: () => void;

    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('data-version', '4');
        reload = vi.fn<() => void>();
        vi.spyOn(
            DeviceDataService.prototype as unknown as { reload: () => void },
            'reload'
        ).mockImplementation(reload);
    });
    afterEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it('removes everything saved on this device, the history too, then starts the app again', async () => {
        const workouts = TestBed.inject(WorkoutStore);
        const history = TestBed.inject(HistoryStore);
        await history.ready;
        workouts.addWorkout({ title: 'Legs', blocks: makeWorkout().blocks, repeats: 3 });
        history.record(ENTRY);
        localStorage.setItem('settings', JSON.stringify({ theme: 'light' }));
        expect(await savedHistory()).toHaveLength(1);

        await TestBed.inject(DeviceDataService).clear();

        expect(localStorage.length).toBe(0);
        expect(await savedHistory()).toEqual([]);
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it("drops a workout going, so it isn't logged as the page unloads", async () => {
        const workouts = TestBed.inject(WorkoutStore);
        workouts.setActiveWorkout(makeWorkout());

        await TestBed.inject(DeviceDataService).clear();

        expect(workouts.activeWorkout()).toBeNull();
        expect(sessionStorage.length).toBe(0);
    });
});
