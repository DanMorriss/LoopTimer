import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Timer } from '../models/timer';
import { TimerStore } from '../shared/state/timer-store.service';
import { TimerSetupComponent } from './timer-setup.component';

const savedTimer: Omit<Timer, 'id'> = {
    title: 'Saved timer',
    timerMinutes: 2,
    timerSeconds: 15,
    restMinutes: 0,
    restSeconds: 45,
    repeats: 4,
    isTimerActive: false,
    isRestActive: false,
    isComplete: false,
};

describe('TimerSetupComponent', () => {
    let fixture: ComponentFixture<TimerSetupComponent>;
    let store: TimerStore;
    let navigate: Mock;

    async function setup(queryParams: Record<string, string> = {}) {
        localStorage.clear();
        await TestBed.configureTestingModule({
            imports: [TimerSetupComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
                },
            ],
        }).compileComponents();

        store = TestBed.inject(TimerStore);
        navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    }

    async function create() {
        fixture = TestBed.createComponent(TimerSetupComponent);
        fixture.detectChanges();
        await fixture.whenStable();
    }

    function el<T extends HTMLElement>(selector: string): T {
        return fixture.nativeElement.querySelector(selector);
    }

    /** What the form currently shows, read from the page like a user would see it. */
    function shown() {
        const value = (id: string) => el<HTMLInputElement | HTMLSelectElement>(`#${id}`).value;
        return {
            title: value('title'),
            timerMinutes: value('timerMinutes'),
            timerSeconds: value('timerSeconds'),
            restMinutes: value('restMinutes'),
            restSeconds: value('restSeconds'),
            repeats: value('repeats'),
        };
    }

    /** Pick an option in a <select>, the way a user would. */
    function choose(id: string, value: string) {
        const select = el<HTMLSelectElement>(`#${id}`);
        select.value = value;
        // Browsers fire both when an option is picked
        select.dispatchEvent(new Event('input'));
        select.dispatchEvent(new Event('change'));
        fixture.detectChanges();
    }

    function type(id: string, value: string) {
        const input = el<HTMLInputElement>(`#${id}`);
        input.value = value;
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();
    }

    function submitButton(): HTMLButtonElement {
        return el<HTMLButtonElement>('button[type="submit"]');
    }

    /** Submit the form and wait for the save to finish. */
    async function submit() {
        el<HTMLFormElement>('form').dispatchEvent(new Event('submit', { cancelable: true }));
        await fixture.whenStable();
        fixture.detectChanges();
    }

    afterEach(() => localStorage.clear());

    describe('creating a timer', () => {
        beforeEach(async () => {
            await setup();
            await create();
        });

        it('starts with an empty form', () => {
            expect(shown()).toEqual({
                title: '',
                timerMinutes: '0',
                timerSeconds: '0',
                restMinutes: '0',
                restSeconds: '0',
                repeats: '1',
            });
            expect(submitButton().textContent).toContain('Start Timer');
            expect(submitButton().textContent).not.toContain('Save');
        });

        it('will not start a timer with no work time', async () => {
            expect(submitButton().disabled).toBe(true);
            expect(fixture.nativeElement.textContent).toContain('Timer must have some time');

            await submit();

            expect(store.timers()).toEqual([]);
            expect(navigate).not.toHaveBeenCalled();
        });

        it('allows a timer with only seconds, or only minutes', () => {
            choose('timerSeconds', '5');
            expect(submitButton().disabled).toBe(false);
            expect(fixture.nativeElement.textContent).not.toContain('Timer must have some time');

            choose('timerSeconds', '0');
            choose('timerMinutes', '1');
            expect(submitButton().disabled).toBe(false);
        });

        it('stops the browser reloading the page on submit', async () => {
            choose('timerSeconds', '5');
            const event = new Event('submit', { cancelable: true });

            el<HTMLFormElement>('form').dispatchEvent(event);
            await fixture.whenStable();

            expect(event.defaultPrevented).toBe(true);
        });

        it('saves the timer with numbers, makes it active, and goes to the timer', async () => {
            type('title', 'Sprints');
            choose('timerMinutes', '1');
            choose('timerSeconds', '30');
            choose('restMinutes', '0');
            choose('restSeconds', '20');
            choose('repeats', '6');

            await submit();

            const expected: Timer = {
                id: 1,
                title: 'Sprints',
                timerMinutes: 1,
                timerSeconds: 30,
                restMinutes: 0,
                restSeconds: 20,
                repeats: 6,
                isTimerActive: false,
                isRestActive: false,
                isComplete: false,
            };
            expect(store.timers()).toEqual([expected]);
            expect(store.activeTimer()).toEqual(expected);
            expect(navigate).toHaveBeenCalledWith(['/timer']);
        });

        it('resets the form after saving', async () => {
            type('title', 'Sprints');
            choose('timerSeconds', '30');

            await submit();

            expect(shown().title).toBe('');
            expect(shown().timerSeconds).toBe('0');
        });
    });

    describe('editing a timer', () => {
        it('fills the form from the timer in ?editId', async () => {
            await setup({ editId: '1' });
            store.addTimer(savedTimer);
            await create();

            expect(shown()).toEqual({
                title: 'Saved timer',
                timerMinutes: '2',
                timerSeconds: '15',
                restMinutes: '0',
                restSeconds: '45',
                repeats: '4',
            });
            expect(submitButton().textContent).toContain('Save & Start Timer');
        });

        it('updates the existing timer instead of adding a new one', async () => {
            await setup({ editId: '1' });
            store.addTimer(savedTimer);
            await create();

            type('title', 'Renamed');
            choose('repeats', '2');
            await submit();

            expect(store.timers()).toHaveLength(1);
            expect(store.timers()[0]).toEqual(
                expect.objectContaining({ id: 1, title: 'Renamed', repeats: 2 })
            );
            expect(store.activeTimer()?.id).toBe(1);
            expect(navigate).toHaveBeenCalledWith(['/timer']);
        });

        for (const editId of ['abc', '0', '-1', '1.5', '99']) {
            it(`ignores an invalid or unknown editId of "${editId}"`, async () => {
                await setup({ editId });
                store.addTimer(savedTimer);
                await create();

                expect(shown().title).toBe('');
                expect(submitButton().textContent).not.toContain('Save');
            });
        }
    });
});
