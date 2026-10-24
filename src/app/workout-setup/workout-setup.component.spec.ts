import type { Mock } from 'vitest';
import { CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
    ActivatedRoute,
    ParamMap,
    Router,
    convertToParamMap,
    provideRouter,
} from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { Workout, WorkoutFields, UNTIL_STOPPED } from '../models/workout';
import { SettingsStore } from '../shared/state/settings-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { ExerciseStore } from '../shared/state/exercise-store.service';
import { reps, rest, unlinked, unlinkedWorkout, work } from '../shared/testing/make-workout';
import { MAX_STEPS, WorkoutSetupComponent } from './workout-setup.component';

const savedWorkout: WorkoutFields = {
    title: 'Saved workout',
    steps: [work(135, 'Squats'), rest(45)],
    repeats: 4,
};

describe('WorkoutSetupComponent', () => {
    let fixture: ComponentFixture<WorkoutSetupComponent>;
    let store: WorkoutStore;
    let navigate: Mock;
    let queryParamMap: BehaviorSubject<ParamMap>;

    async function setup(queryParams: Record<string, string> = {}) {
        // Ids are random; here they're workout-1, workout-2… in the order workouts are made
        let made = 0;
        vi.spyOn(crypto, 'randomUUID').mockImplementation(
            () => `workout-${++made}` as ReturnType<typeof crypto.randomUUID>
        );
        localStorage.clear();
        queryParamMap = new BehaviorSubject(convertToParamMap(queryParams));
        await TestBed.configureTestingModule({
            imports: [WorkoutSetupComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: { queryParamMap },
                },
            ],
        }).compileComponents();

        store = TestBed.inject(WorkoutStore);
        navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    }

    /**
     * Opens the page. A new workout starts empty, so most tests add an empty timed step and
     * rest step first, both open, to have something to work on; `empty` leaves it as it opens.
     */
    async function create({ empty = false } = {}) {
        fixture = TestBed.createComponent(WorkoutSetupComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        if (!empty && steps().length === 0) {
            await press('Add timed');
            await press('Add rest');
            await press('Step 1, timed, 00:00');
        }
    }

    function el<T extends HTMLElement>(
        selector: string,
        within: ParentNode = fixture.nativeElement
    ): T {
        return within.querySelector(selector) as T;
    }

    const steps = () =>
        Array.from(fixture.nativeElement.querySelectorAll('.step')) as HTMLElement[];

    /** What the form currently shows, read from the page like a user would see it. */
    function shown() {
        // A wheel picker announces its value through its spin button
        const value = (wheel: Element) =>
            wheel.querySelector('[role="spinbutton"]')!.getAttribute('aria-valuenow');
        return {
            title: el<HTMLInputElement>('#title').value,
            steps: steps().map((step) => {
                const kind = el('.step__badge', step).textContent!.trim();
                // A rep step shows its count, e.g. "20 reps", on its one wheel or in one line
                if (kind === 'Reps') {
                    const count = isCollapsed(step)
                        ? el('.step__summary-time', step).textContent!.trim()
                        : `${value(el('app-wheel-picker', step))} reps`;
                    return {
                        kind,
                        name: isCollapsed(step)
                            ? el('.step__summary-name', step).textContent!.trim()
                            : el<HTMLInputElement>('input', step).value,
                        time: count,
                    };
                }
                // A collapsed step shows its name and time in one line, e.g. "Squats 02:15"
                if (isCollapsed(step)) {
                    const [minutes, seconds] = el('.step__summary-time', step)
                        .textContent!.trim()
                        .split(':')
                        .map(Number);
                    return {
                        kind,
                        name: el('.step__summary-name', step).textContent!.trim(),
                        time: `${minutes}:${seconds}`,
                    };
                }
                const [minutes, seconds] = Array.from(step.querySelectorAll('app-wheel-picker'));
                return {
                    kind,
                    name: el<HTMLInputElement>('input', step).value,
                    time: `${value(minutes)}:${value(seconds)}`,
                };
            }),
            repeats: value(el('#repeats')),
        };
    }

    const toggle = (step: number) => el<HTMLButtonElement>('.step__toggle', steps()[step]);
    const isCollapsed = (step: HTMLElement) =>
        el('.step__toggle', step).getAttribute('aria-expanded') === 'false';
    const collapsed = () => steps().map(isCollapsed);

    /** Pick a number in a step's wheel by clicking it, the way a user would. */
    function chooseTime(step: number, wheel: 'minutes' | 'seconds', value: string) {
        const wheels = steps()[step].querySelectorAll('app-wheel-picker');
        el(`[data-value="${value}"]`, wheels[wheel === 'minutes' ? 0 : 1]).click();
        fixture.detectChanges();
    }

    /** Pick a number on a rep step's one wheel. */
    function chooseReps(step: number, value: string) {
        el(`app-wheel-picker [data-value="${value}"]`, steps()[step]).click();
        fixture.detectChanges();
    }

    function chooseRounds(value: string) {
        el(`#repeats [data-value="${value}"]`).click();
        fixture.detectChanges();
    }

    function typeInto(input: HTMLInputElement, value: string) {
        input.value = value;
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();
    }

    const typeTitle = (value: string) => typeInto(el('#title'), value);
    const typeName = (step: number, value: string) => typeInto(el('input', steps()[step]), value);

    /** A button by its accessible name, e.g. "Add timed" or "Move Step 2, rest up". */
    function button(name: string): HTMLButtonElement {
        const all = Array.from(
            fixture.nativeElement.querySelectorAll('button')
        ) as HTMLButtonElement[];
        // Icon fonts put the icon's name in the text ("add"), so leave <mat-icon> out
        const accessibleName = (b: HTMLButtonElement) =>
            b.getAttribute('aria-label') ??
            Array.from(b.childNodes)
                .filter((node) => node.nodeName !== 'MAT-ICON')
                .map((node) => node.textContent)
                .join('')
                .trim();
        const found = all.find((b) => accessibleName(b) === name);
        expect(found, `expected a "${name}" button`).toBeDefined();
        return found!;
    }

    async function press(name: string) {
        button(name).click();
        fixture.detectChanges();
        await fixture.whenStable();
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

    describe('creating a workout', () => {
        beforeEach(async () => {
            await setup();
            await create();
        });

        it('starts with no steps, just the Add buttons and a hint, and nothing to start', async () => {
            await create({ empty: true });

            expect(shown()).toEqual({ title: '', steps: [], repeats: '1' });
            expect(fixture.nativeElement.textContent).toContain('Add a step to start.');
            expect(fixture.nativeElement.textContent).not.toContain('Workout needs');
            expect(fixture.nativeElement.textContent).not.toContain('Collapse all');
            expect(button('Add timed').disabled).toBe(false);
            expect(submitButton().disabled).toBe(true);
            expect(submitButton().textContent).toContain('Start workout');
            expect(submitButton().textContent).not.toContain('Save');
        });

        it('will not start a workout with no work time', async () => {
            chooseTime(1, 'seconds', '30'); // only rest
            expect(submitButton().disabled).toBe(true);
            expect(fixture.nativeElement.textContent).toContain(
                'Workout needs a timed step or some reps'
            );

            await submit();

            expect(store.workouts()).toEqual([]);
            expect(navigate).not.toHaveBeenCalled();
        });

        it('allows a workout with only seconds, or only minutes', () => {
            chooseTime(0, 'seconds', '5');
            expect(submitButton().disabled).toBe(false);
            expect(fixture.nativeElement.textContent).not.toContain('Workout needs');

            chooseTime(0, 'seconds', '0');
            chooseTime(0, 'minutes', '1');
            expect(submitButton().disabled).toBe(false);
        });

        it('stops the browser reloading the page on submit', async () => {
            chooseTime(0, 'seconds', '5');
            const event = new Event('submit', { cancelable: true });

            el<HTMLFormElement>('form').dispatchEvent(event);
            await fixture.whenStable();

            expect(event.defaultPrevented).toBe(true);
        });

        it('saves the workout as steps, makes it active, and goes to the workout', async () => {
            typeTitle('Sprints');
            typeName(0, '  Hill sprint ');
            chooseTime(0, 'minutes', '1');
            chooseTime(0, 'seconds', '30');
            chooseTime(1, 'seconds', '20');
            chooseRounds('6');

            await submit();

            // "Hill sprint" isn't a built-in exercise, so it becomes your own, which takes an id too
            const expected: Workout = {
                id: expect.any(String),
                updatedAt: expect.any(Number),
                title: 'Sprints',
                steps: [work(90, 'Hill sprint'), rest(20)],
                repeats: 6,
            };
            expect(store.workouts().map(unlinkedWorkout)).toEqual([expected]);
            expect(unlinkedWorkout(store.activeWorkout())).toEqual(expected);
            expect(navigate).toHaveBeenCalledWith(['/workout']);
        });

        it('leaves out steps left at 00:00', async () => {
            chooseTime(0, 'seconds', '30');

            await submit();

            expect(unlinked(store.workouts()[0].steps)).toEqual([work(30)]);
        });

        it('resets the form after saving', async () => {
            typeTitle('Sprints');
            chooseTime(0, 'seconds', '30');

            await submit();

            expect(shown()).toEqual({ title: '', steps: [], repeats: '1' });
        });
    });

    describe('steps', () => {
        beforeEach(async () => {
            await setup();
            await create();
        });

        const said = () => el('[aria-live="polite"]').textContent!.trim();

        it('adds work and rest steps at the end, focusing the new name box', async () => {
            await press('Add timed');
            await press('Add rest');

            expect(shown().steps.map((s) => s.kind)).toEqual(['Timed', 'Rest', 'Timed', 'Rest']);
            expect(document.activeElement).toBe(el('input', steps()[3]));
            expect(said()).toBe('Added a rest step, step 4');
        });

        describe('rep steps', () => {
            it('adds one with Reps and Weight wheels, focusing its name box', async () => {
                await press('Add reps');

                expect(shown().steps[2]).toEqual({ kind: 'Reps', name: '', time: '0 reps' });
                const step = steps()[2];
                expect(step.classList).toContain('step--reps');
                expect(step.querySelectorAll('app-wheel-picker')).toHaveLength(2);
                expect(
                    Array.from(step.querySelectorAll('.picker-row .picker-field__label')).map(
                        (label) => label.textContent!.trim()
                    )
                ).toEqual(['Reps', 'Weight (kg)']);
                expect(el<HTMLInputElement>('input', step).placeholder).toBe('e.g. Push-ups');
                expect(document.activeElement).toBe(el('input', step));
                expect(fixture.nativeElement.textContent).toContain('Added a rep step, step 3');
            });

            it('saves the reps, in order with the other steps', async () => {
                chooseTime(0, 'seconds', '30');
                await press('Add reps');
                typeName(2, 'Push-ups');
                chooseReps(2, '20');

                await submit();

                expect(unlinked(store.workouts()[0].steps)).toEqual([
                    work(30),
                    reps(20, 'Push-ups'),
                ]);
            });

            it('leaves out a rep step left at 0 reps', async () => {
                chooseTime(0, 'seconds', '30');
                await press('Add reps');

                await submit();

                expect(unlinked(store.workouts()[0].steps)).toEqual([work(30)]);
            });

            it('counts reps as work, so a workout of only reps can start', async () => {
                await press('Add reps');
                expect(submitButton().disabled).toBe(true);

                chooseReps(2, '10');

                expect(submitButton().disabled).toBe(false);
                await submit();
                expect(unlinked(store.workouts()[0].steps)).toEqual([reps(10)]);
            });

            describe('weight', () => {
                /** Pick a weight on a rep step's second wheel. */
                function chooseWeight(step: number, value: string) {
                    const wheel = steps()[step].querySelectorAll('app-wheel-picker')[1];
                    el(`[data-value="${value}"]`, wheel).click();
                    fixture.detectChanges();
                }

                it('starts at none, read out as "none", and goes up in halves', async () => {
                    await press('Add reps');
                    const wheel = steps()[2].querySelectorAll('app-wheel-picker')[1];
                    const spin = el('[role="spinbutton"]', wheel);

                    expect(spin.getAttribute('aria-valuetext')).toBe('none');
                    expect(el('[data-value="22.5"]', wheel)).not.toBeNull();
                    expect(spin.getAttribute('aria-valuemax')).toBe('300');
                });

                it('saves the weight in kg, and none for a step left at –', async () => {
                    await press('Add reps');
                    typeName(2, 'Squats');
                    chooseReps(2, '10');
                    chooseWeight(2, '22.5');
                    await press('Add reps');
                    chooseReps(3, '20');

                    await submit();

                    expect(unlinked(store.workouts()[0].steps)).toEqual([
                        { kind: 'reps', reps: 10, name: 'Squats', weight: 22.5 },
                        reps(20),
                    ]);
                });

                it('shows it with the reps once collapsed, and when asking before deleting', async () => {
                    await press('Add reps');
                    chooseReps(2, '10');
                    chooseWeight(2, '60');

                    await press('Step 3, reps, 10 reps @ 60 kg');
                    expect(shown().steps[2].time).toBe('10 reps @ 60 kg');

                    await press('Step 3, reps, 10 reps @ 60 kg');
                    await press('Delete Step 3, reps');
                    expect(
                        fixture.nativeElement.querySelector('app-confirm-dialog')?.textContent
                    ).toContain('This will remove Step 3, reps, set to 10 reps @ 60 kg.');
                });

                it('asks before deleting a step with only a weight', async () => {
                    await press('Add reps');
                    chooseWeight(2, '20');

                    await press('Delete Step 3, reps');

                    expect(
                        fixture.nativeElement.querySelector('app-confirm-dialog')
                    ).not.toBeNull();
                });
            });

            it('names the reps when asking before deleting', async () => {
                await press('Add reps');
                chooseReps(2, '20');

                await press('Delete Step 3, reps');

                expect(
                    fixture.nativeElement.querySelector('app-confirm-dialog')?.textContent
                ).toContain('This will remove Step 3, reps, set to 20 reps.');
            });
        });

        it('runs a round of several steps, saved in order with their names', async () => {
            typeName(0, 'Squats');
            chooseTime(0, 'seconds', '30');
            await press('Add timed');
            typeName(2, 'Plank');
            chooseTime(2, 'seconds', '45');
            await press('Step 2, rest, 00:00');
            chooseTime(1, 'seconds', '15');

            await submit();

            expect(unlinked(store.workouts()[0].steps)).toEqual([
                work(30, 'Squats'),
                rest(15),
                work(45, 'Plank'),
            ]);
        });

        it('moves a step up or down, keeping its name and time, and focus with it', async () => {
            typeName(0, 'Squats');
            chooseTime(0, 'seconds', '30');
            chooseTime(1, 'seconds', '10');

            await press('Move Step 1, Squats down');

            expect(shown().steps).toEqual([
                { kind: 'Rest', name: '', time: '0:10' },
                { kind: 'Timed', name: 'Squats', time: '0:30' },
            ]);
            // It's now last, so its down button is disabled: focus goes to its up button
            expect(document.activeElement).toBe(button('Move Step 2, Squats up'));
            expect(said()).toBe('Moved Squats to step 2');
        });

        it('moves a step dropped by drag and drop, and says so', async () => {
            typeName(0, 'Squats');
            chooseTime(0, 'seconds', '30');
            await press('Add timed');
            typeName(2, 'Plank');

            // What the CDK reports when Squats is dragged from first to last
            const list = fixture.debugElement
                .query(By.directive(CdkDropList))
                .injector.get(CdkDropList);
            list.dropped.emit({ previousIndex: 0, currentIndex: 2 } as CdkDragDrop<unknown>);
            fixture.detectChanges();

            expect(shown().steps.map((s) => s.name || s.kind)).toEqual(['Rest', 'Plank', 'Squats']);
            expect(shown().steps[2].time).toBe('0:30');
            expect(said()).toBe('Moved Squats to step 3');
        });

        it('gives each step a drag handle, hidden from screen readers (they use the buttons)', () => {
            const handles = steps().map((step) => el('[cdkDragHandle], .step__handle', step));

            expect(handles.every((handle) => handle !== null)).toBe(true);
            expect(handles[0].getAttribute('aria-hidden')).toBe('true');
        });

        it('can not move the first step up or the last step down', () => {
            expect(button('Move Step 1, timed up').disabled).toBe(true);
            expect(button('Move Step 2, rest down').disabled).toBe(true);
            expect(button('Move Step 1, timed down').disabled).toBe(false);
        });

        it('deletes a step, focusing the step that takes its place', async () => {
            await press('Add timed');
            typeName(2, 'Plank');
            await press('Step 2, rest, 00:00');

            await press('Delete Step 2, rest');

            expect(shown().steps.map((s) => s.name || s.kind)).toEqual(['Timed', 'Plank']);
            expect(document.activeElement).toBe(button('Delete Step 2, Plank'));
            expect(said()).toBe('Deleted step 2');
        });

        it('focuses the open button of a collapsed step that takes a deleted one’s place', async () => {
            await press('Collapse all');
            await press('Step 1, timed, 00:00');

            await press('Delete Step 1, timed');

            expect(document.activeElement).toBe(button('Step 1, rest, 00:00'));
        });

        describe('deleting a step with something in it', () => {
            const dialog = () => el('[role="dialog"]');

            beforeEach(() => {
                typeName(1, 'Breathe');
                chooseTime(1, 'seconds', '20');
            });

            it('deletes an empty step without asking', async () => {
                await press('Delete Step 1, timed');

                expect(dialog()).toBeNull();
                expect(steps()).toHaveLength(1);
            });

            it('asks first, naming the step and its time', async () => {
                await press('Delete Step 2, Breathe');

                expect(dialog()?.textContent).toContain('Delete step?');
                expect(dialog()?.textContent).toContain(
                    'This will remove Step 2, Breathe, set to 00:20.'
                );
                expect(steps()).toHaveLength(2);
            });

            it('asks about a step with only a name, or only a time', async () => {
                typeName(0, 'Squats');
                await press('Delete Step 1, Squats');
                expect(dialog()).not.toBeNull();
                await press('Cancel');

                typeName(0, '');
                chooseTime(0, 'seconds', '5');
                await press('Delete Step 1, timed');
                expect(dialog()).not.toBeNull();
            });

            it('keeps the step when cancelled, and returns focus to its delete button', async () => {
                await press('Delete Step 2, Breathe');

                await press('Cancel');

                expect(dialog()).toBeNull();
                expect(shown().steps[1]).toEqual({ kind: 'Rest', name: 'Breathe', time: '0:20' });
                expect(document.activeElement).toBe(button('Delete Step 2, Breathe'));
            });

            it('deletes the step when confirmed', async () => {
                await press('Delete Step 2, Breathe');

                await press('Delete');

                expect(dialog()).toBeNull();
                expect(shown().steps.map((s) => s.kind)).toEqual(['Timed']);
                expect(said()).toBe('Deleted step 2');
            });
        });

        it('deletes every step if asked, then focuses "Add timed"', async () => {
            await press('Delete Step 2, rest');
            await press('Delete Step 1, timed');

            expect(steps()).toHaveLength(0);
            expect(fixture.nativeElement.textContent).toContain('Add a step to start.');
            expect(document.activeElement).toBe(button('Add timed'));
        });

        it(`stops adding at ${MAX_STEPS} steps, and says why`, async () => {
            for (let i = 2; i < MAX_STEPS; i++) {
                await press('Add timed');
            }

            expect(steps()).toHaveLength(MAX_STEPS);
            expect(button('Add timed').disabled).toBe(true);
            expect(button('Add rest').disabled).toBe(true);
            expect(fixture.nativeElement.textContent).toContain(
                `That's the most steps a workout can have (${MAX_STEPS})`
            );
        });

        describe('collapsing', () => {
            it('opens only the step just added, closing the others', async () => {
                await press('Add timed');

                expect(collapsed()).toEqual([true, true, false]);
            });

            it('shows a collapsed step in one line: its name and time', async () => {
                typeName(0, 'Squats');
                chooseTime(0, 'minutes', '2');
                chooseTime(0, 'seconds', '15');

                await press('Step 1, Squats, 02:15');

                expect(steps()[0].querySelector('app-wheel-picker')).toBeNull();
                expect(el('.step__summary', steps()[0]).textContent).toContain('Squats');
                expect(el('.step__summary', steps()[0]).textContent).toContain('02:15');
                expect(shown().steps[0]).toEqual({ kind: 'Timed', name: 'Squats', time: '2:15' });
            });

            it('opens and closes a step with its button, which says whether it is open', async () => {
                const body = () =>
                    document.getElementById(toggle(0).getAttribute('aria-controls')!);
                expect(toggle(0).getAttribute('aria-expanded')).toBe('true');
                expect(body()?.querySelector('app-wheel-picker')).not.toBeNull();

                toggle(0).focus();
                await press('Step 1, timed, 00:00');

                expect(toggle(0).getAttribute('aria-expanded')).toBe('false');
                // Nothing to point at while closed
                expect(toggle(0).hasAttribute('aria-controls')).toBe(false);
                expect(document.activeElement).toBe(toggle(0));

                await press('Step 1, timed, 00:00');

                expect(toggle(0).getAttribute('aria-expanded')).toBe('true');
                expect(document.activeElement).toBe(toggle(0));
            });

            it('collapses and expands every step at once', async () => {
                await press('Add timed');

                await press('Collapse all');
                expect(collapsed()).toEqual([true, true, true]);

                await press('Expand all');
                expect(collapsed()).toEqual([false, false, false]);
            });

            it('keeps a step open or closed as it moves', async () => {
                await press('Step 2, rest, 00:00');

                await press('Move Step 1, timed down');

                expect(shown().steps.map((s) => s.kind)).toEqual(['Rest', 'Timed']);
                expect(collapsed()).toEqual([true, false]);
            });

            it('keeps a collapsed step to one line: its drag handle stays, its buttons wait until it is opened', async () => {
                await press('Collapse all');

                expect(el('.step__handle', steps()[0])).not.toBeNull();
                expect(el('.step__actions', steps()[0])).toBeNull();

                await press('Step 1, timed, 00:00');

                expect(button('Move Step 1, timed down').disabled).toBe(false);
                expect(button('Delete Step 1, timed').disabled).toBe(false);
            });
        });

        it('names each wheel for screen readers by its step, e.g. "Step 2, rest" and "Seconds"', () => {
            const spin = steps()[1].querySelectorAll('[role="spinbutton"]')[1];
            const label = spin
                .getAttribute('aria-labelledby')!
                .split(' ')
                // Screen readers skip the aria-hidden step number, as here
                .map((id) => {
                    const labelEl = document.getElementById(id)!.cloneNode(true) as HTMLElement;
                    labelEl.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
                    return labelEl.textContent!.replace(/\s+/g, ' ').trim();
                });

            expect(label).toEqual(['Step 2, rest', 'Seconds']);
        });
    });

    describe('exercises', () => {
        const status = (step: number) =>
            el('.step__exercise-status', steps()[step])?.textContent!.replace(/\s+/g, ' ').trim();

        function pick(step: number, name: string) {
            const option = Array.from(steps()[step].querySelectorAll('[role="option"]')).find(
                (o) => o.querySelector('.exercise-picker__name')!.textContent!.trim() === name
            ) as HTMLElement;
            expect(option, `expected "${name}" in the list`).toBeDefined();
            option.click();
            fixture.detectChanges();
        }

        it('finds an exercise as a work or rep step is named, and saves the step linked to it', async () => {
            await setup();
            await create();

            typeName(0, 'front sq');
            pick(0, 'Front squat');
            chooseTime(0, 'seconds', '30');
            await submit();

            expect(store.workouts()[0].steps[0]).toEqual({
                kind: 'work',
                seconds: 30,
                name: 'Front squat',
                exerciseId: 'builtin:front-squat',
            });
        });

        it('says which exercise a step is, or that a new one will be made', async () => {
            await setup();
            await create();

            expect(steps()[0].querySelector('[role="combobox"]')).not.toBeNull();
            expect(status(0)).toBeUndefined();
            typeName(0, 'Squats');
            expect(status(0)).toBe('Built-in exercise');
            typeName(0, 'Wall walk');
            expect(status(0)).toBe('A new exercise of your own, made when the workout is saved');
            // A rest isn't an exercise, so it has a plain name box
            expect(steps()[1].querySelector('[role="combobox"]')).toBeNull();
        });

        it('adds a note to a built-in exercise, shown under the step', async () => {
            await setup();
            await create();
            typeName(0, 'Back squat');

            await press('Add a note to Back squat');
            const note = el<HTMLTextAreaElement>('#exercise-editor-note');
            typeInto(note as unknown as HTMLInputElement, 'Pause at the bottom');
            el('.editor__save').click();
            fixture.detectChanges();
            await fixture.whenStable();

            expect(el('app-exercise-editor')).toBeNull();
            expect(status(0)).toBe('Built-in exercise Your note: Pause at the bottom');
            expect(document.activeElement).toBe(button('Edit your note on Back squat'));
        });

        it('renames your own exercise from its step, in the form and in saved workouts', async () => {
            await setup({ editId: 'workout-2' });
            const exercises = TestBed.inject(ExerciseStore);
            const mine = exercises.addOwn('Sled push', 'timed');
            store.addWorkout({
                title: 'Sleds',
                steps: [work(30, 'Sled push'), rest(30)],
                repeats: 2,
            });
            await create();
            await press('Step 1, Sled push, 00:30');

            await press('Edit Sled push');
            typeInto(el('#exercise-editor-name'), 'Sled drag');
            el('.editor__save').click();
            fixture.detectChanges();
            await fixture.whenStable();

            expect(exercises.byId(mine.id)?.name).toBe('Sled drag');
            expect(shown().steps[0].name).toBe('Sled drag');
            expect(store.workouts()[0].steps[0]).toEqual({
                ...work(30, 'Sled drag'),
                exerciseId: mine.id,
            });
            expect(status(0)).toBe('Your own exercise');
        });

        it("shows the exercise's details, as its page does, without leaving", async () => {
            await setup();
            await create();
            typeName(0, 'front sq');
            pick(0, 'Front squat');

            await press('Details of Front squat');

            const dialog = el('[role="dialog"]');
            expect(el('#exercise-details-title').textContent!.trim()).toBe('Front squat');
            // At the top, rather than scrolled down to the first button
            expect(document.activeElement).toBe(el('#exercise-details-title'));
            expect(dialog.getAttribute('aria-labelledby')).toBe('exercise-details-title');
            expect(el('.exercise__description', dialog)).not.toBeNull();
            expect(el('app-body-map', dialog)).not.toBeNull();
            expect(el('.exercise__steps', dialog)).not.toBeNull();

            el('.details__done').click();
            fixture.detectChanges();
            await fixture.whenStable();

            expect(el('app-exercise-details-dialog')).toBeNull();
            expect(document.activeElement).toBe(button('Details of Front squat'));
        });

        it('goes back to the name box to pick another, ready to type over', async () => {
            await setup();
            await create();
            typeName(0, 'Back squat');

            await press('Details of Back squat');
            el('.details__pick-another').click();
            fixture.detectChanges();
            await fixture.whenStable();

            const box = el<HTMLInputElement>('[role="combobox"]', steps()[0]);
            expect(el('app-exercise-details-dialog')).toBeNull();
            expect(document.activeElement).toBe(box);
            expect([box.selectionStart, box.selectionEnd]).toEqual([0, 'Back squat'.length]);
        });
    });

    describe('until stopped', () => {
        beforeEach(async () => {
            await setup();
            await create();
        });

        const toggle = () => el<HTMLButtonElement>('app-infinity-switch [role="switch"]');
        const isOn = () => toggle().getAttribute('aria-checked') === 'true';
        const roundsSaid = () => el('#repeats [role="spinbutton"]').getAttribute('aria-valuetext');

        it('ends the rounds wheel with ∞, read out as "until stopped"', () => {
            const items = Array.from(
                fixture.nativeElement.querySelectorAll('#repeats .wheel-picker__item')
            ) as HTMLElement[];

            expect(items.at(-2)?.textContent?.trim()).toBe('30');
            expect(items.at(-1)?.textContent?.trim()).toBe('∞');
        });

        it('has a labelled switch next to the wheel, off to begin with', () => {
            expect(toggle().getAttribute('aria-labelledby')).toBe('untilStopped-label');
            expect(el('#untilStopped-label').textContent).toBe('Until stopped');
            expect(isOn()).toBe(false);
        });

        it('turns the wheel to ∞ when the switch is turned on', () => {
            toggle().click();
            fixture.detectChanges();

            expect(isOn()).toBe(true);
            expect(roundsSaid()).toBe('until stopped');
        });

        it('goes back to the rounds picked before when the switch is turned off', () => {
            chooseRounds('8');
            toggle().click();
            fixture.detectChanges();

            toggle().click();
            fixture.detectChanges();

            expect(isOn()).toBe(false);
            expect(shown().repeats).toBe('8');
        });

        it('turns the switch on when ∞ is picked on the wheel, and off again when a number is', () => {
            chooseRounds('0'); // ∞
            expect(isOn()).toBe(true);

            chooseRounds('12');
            expect(isOn()).toBe(false);
        });

        it('saves a workout that runs until stopped', async () => {
            chooseTime(0, 'seconds', '30');
            toggle().click();
            fixture.detectChanges();

            await submit();

            expect(store.workouts()[0].repeats).toBe(UNTIL_STOPPED);
        });
    });

    describe('time limit', () => {
        beforeEach(async () => {
            await setup();
            await create();
        });

        const mode = (label: string) =>
            Array.from(
                fixture.nativeElement.querySelectorAll(
                    'input[name="repeatMode"]'
                ) as NodeListOf<HTMLInputElement>
            ).find((input) => input.parentElement!.textContent!.trim() === label)!;
        const chooseMode = (label: string) => {
            mode(label).click();
            fixture.detectChanges();
        };
        const chooseLimit = (wheel: 'minutes' | 'seconds', value: string) => {
            el(`#limit-${wheel} [data-value="${value}"]`).click();
            fixture.detectChanges();
        };
        const limitSaid = (wheel: 'minutes' | 'seconds') =>
            el(`#limit-${wheel} [role="spinbutton"]`).getAttribute('aria-valuenow');

        it('offers Rounds or Time limit, Rounds to begin with', () => {
            expect(mode('Rounds').checked).toBe(true);
            expect(mode('Time limit').checked).toBe(false);
            expect(fixture.nativeElement.querySelector('#limit-minutes')).toBeNull();
        });

        it('swaps the rounds for minutes and seconds wheels, at 20:00 to begin with', () => {
            chooseMode('Time limit');

            expect(fixture.nativeElement.querySelector('#repeats')).toBeNull();
            expect(limitSaid('minutes')).toBe('20');
            expect(limitSaid('seconds')).toBe('0');
        });

        it('saves the time limit, with rounds until stopped', async () => {
            chooseTime(0, 'seconds', '30');
            chooseMode('Time limit');
            chooseLimit('minutes', '12');
            chooseLimit('seconds', '30');

            await submit();

            const saved = store.workouts()[0];
            expect(saved.repeats).toBe(UNTIL_STOPPED);
            expect(saved.timeLimitSeconds).toBe(750);
        });

        it("won't save a time limit of 00:00", () => {
            chooseTime(0, 'seconds', '30');
            chooseMode('Time limit');
            chooseLimit('minutes', '0');

            expect(fixture.nativeElement.textContent).toContain(
                'Time limit needs to be longer than 00:00'
            );
            expect(submitButton().disabled).toBe(true);
        });

        it('saves rounds again, and no time limit, when Rounds is picked back', async () => {
            chooseTime(0, 'seconds', '30');
            chooseRounds('5');
            chooseMode('Time limit');
            chooseMode('Rounds');

            await submit();

            expect(store.workouts()[0].repeats).toBe(5);
            expect('timeLimitSeconds' in store.workouts()[0]).toBe(false);
        });
    });

    describe('editing a workout with a time limit', () => {
        it('opens on Time limit with its time', async () => {
            await setup({ editId: 'workout-1' });
            store.addWorkout({ ...savedWorkout, repeats: UNTIL_STOPPED, timeLimitSeconds: 1230 });
            await create();

            const timeLimit = el<HTMLInputElement>('input[name="repeatMode"][value="time"]');
            expect(timeLimit.checked).toBe(true);
            expect(el('#limit-minutes [role="spinbutton"]').getAttribute('aria-valuenow')).toBe(
                '20'
            );
            expect(el('#limit-seconds [role="spinbutton"]').getAttribute('aria-valuenow')).toBe(
                '30'
            );
        });
    });

    describe('editing a workout', () => {
        it('fills the form from the workout in ?editId', async () => {
            await setup({ editId: 'workout-1' });
            store.addWorkout(savedWorkout);
            await create();

            expect(shown()).toEqual({
                title: 'Saved workout',
                steps: [
                    { kind: 'Timed', name: 'Squats', time: '2:15' },
                    { kind: 'Rest', name: '', time: '0:45' },
                ],
                repeats: '4',
            });
            expect(submitButton().textContent).toContain('Save & start workout');
        });

        describe('weights in pounds', () => {
            // 45 lb, saved in kg
            const pressed: WorkoutFields = {
                ...savedWorkout,
                steps: [{ kind: 'reps', reps: 10, name: 'Bench', weight: 20.412 }],
            };

            async function editInPounds() {
                await setup({ editId: 'workout-1' });
                TestBed.inject(SettingsStore).update({ weightUnit: 'lb' });
                store.addWorkout(pressed);
                await create();
            }

            it('shows and picks weights in lb, as chosen in settings', async () => {
                await editInPounds();

                expect(shown().steps[0].time).toBe('10 reps @ 45 lb');
                await press('Step 1, Bench, 10 reps @ 45 lb');
                expect(fixture.nativeElement.textContent).toContain('Weight (lb)');
            });

            it('keeps a weight as it was saved when it is left alone', async () => {
                await editInPounds();
                typeTitle('Renamed');

                await submit();

                expect(unlinked(store.workouts()[0].steps)).toEqual(pressed.steps);
            });

            it('saves a weight picked in lb in kg', async () => {
                await editInPounds();
                await press('Step 1, Bench, 10 reps @ 45 lb');
                const wheel = steps()[0].querySelectorAll('app-wheel-picker')[1];
                el('[data-value="135"]', wheel).click();
                fixture.detectChanges();

                await submit();

                expect(unlinked(store.workouts()[0].steps)).toEqual([
                    { kind: 'reps', reps: 10, name: 'Bench', weight: 61.235 },
                ]);
            });
        });

        it('shows a rep step collapsed as its name and count', async () => {
            await setup({ editId: 'workout-1' });
            store.addWorkout({ ...savedWorkout, steps: [work(30), reps(1, 'Pull-up'), reps(20)] });
            await create();

            expect(shown().steps).toEqual([
                { kind: 'Timed', name: '', time: '0:30' },
                { kind: 'Reps', name: 'Pull-up', time: '1 rep' },
                { kind: 'Reps', name: '', time: '20 reps' },
            ]);
        });

        it('opens with every step collapsed, so the whole workout is in view', async () => {
            await setup({ editId: 'workout-1' });
            store.addWorkout(savedWorkout);
            await create();

            expect(collapsed()).toEqual([true, true]);
            expect(button('Expand all')).toBeDefined();
        });

        it('updates the existing workout instead of adding a new one', async () => {
            await setup({ editId: 'workout-1' });
            store.addWorkout(savedWorkout);
            await create();

            typeTitle('Renamed');
            chooseRounds('2');
            await submit();

            expect(store.workouts()).toHaveLength(1);
            expect(unlinkedWorkout(store.workouts()[0])).toEqual({
                id: 'workout-1',
                updatedAt: expect.any(Number),
                title: 'Renamed',
                steps: savedWorkout.steps,
                repeats: 2,
            });
            expect(store.activeWorkout()?.id).toBe('workout-1');
            expect(navigate).toHaveBeenCalledWith(['/workout']);
        });

        it('empties the form for a new workout when the editId goes, as Create from the menu does', async () => {
            await setup({ editId: 'workout-1' });
            store.addWorkout(savedWorkout);
            await create();

            queryParamMap.next(convertToParamMap({}));
            fixture.detectChanges();
            await fixture.whenStable();

            expect(shown()).toEqual({ title: '', steps: [], repeats: '1' });
            expect(submitButton().textContent).not.toContain('Save');
        });

        it('switches to another workout when the editId changes', async () => {
            await setup({ editId: 'workout-1' });
            store.addWorkout(savedWorkout);
            store.addWorkout({ ...savedWorkout, title: 'Other workout' });
            await create();

            queryParamMap.next(convertToParamMap({ editId: 'workout-2' }));
            fixture.detectChanges();
            await fixture.whenStable();

            expect(shown().title).toBe('Other workout');
        });

        for (const editId of ['abc', '0', '-1', '1.5', '99']) {
            it(`ignores an invalid or unknown editId of "${editId}"`, async () => {
                await setup({ editId });
                store.addWorkout(savedWorkout);
                await create();

                expect(shown().title).toBe('');
                expect(submitButton().textContent).not.toContain('Save');
            });
        }
    });
});
