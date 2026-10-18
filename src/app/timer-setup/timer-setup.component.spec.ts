import type { Mock } from 'vitest';
import { CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Timer, UNTIL_STOPPED } from '../models/timer';
import { TimerStore } from '../shared/state/timer-store.service';
import { rest, work } from '../shared/testing/make-timer';
import { MAX_STEPS, TimerSetupComponent } from './timer-setup.component';

const savedTimer: Omit<Timer, 'id'> = {
    title: 'Saved timer',
    steps: [work(135, 'Squats'), rest(45)],
    repeats: 4,
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
                const [minutes, seconds] = Array.from(step.querySelectorAll('app-wheel-picker'));
                return {
                    kind: el('.step__badge', step).textContent!.trim(),
                    name: el<HTMLInputElement>('input', step).value,
                    time: `${value(minutes)}:${value(seconds)}`,
                };
            }),
            repeats: value(el('#repeats')),
        };
    }

    /** Pick a number in a step's wheel by clicking it, the way a user would. */
    function chooseTime(step: number, wheel: 'minutes' | 'seconds', value: string) {
        const wheels = steps()[step].querySelectorAll('app-wheel-picker');
        el(`[data-value="${value}"]`, wheels[wheel === 'minutes' ? 0 : 1]).click();
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

    /** A button by its accessible name, e.g. "Add work" or "Move Step 2, rest up". */
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

    describe('creating a timer', () => {
        beforeEach(async () => {
            await setup();
            await create();
        });

        it('starts with a work step and a rest step, both empty', () => {
            expect(shown()).toEqual({
                title: '',
                steps: [
                    { kind: 'Work', name: '', time: '0:0' },
                    { kind: 'Rest', name: '', time: '0:0' },
                ],
                repeats: '1',
            });
            expect(submitButton().textContent).toContain('Start Timer');
            expect(submitButton().textContent).not.toContain('Save');
        });

        it('will not start a timer with no work time', async () => {
            chooseTime(1, 'seconds', '30'); // only rest
            expect(submitButton().disabled).toBe(true);
            expect(fixture.nativeElement.textContent).toContain('Timer must have some work time');

            await submit();

            expect(store.timers()).toEqual([]);
            expect(navigate).not.toHaveBeenCalled();
        });

        it('allows a timer with only seconds, or only minutes', () => {
            chooseTime(0, 'seconds', '5');
            expect(submitButton().disabled).toBe(false);
            expect(fixture.nativeElement.textContent).not.toContain('Timer must have some');

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

        it('saves the timer as steps, makes it active, and goes to the timer', async () => {
            typeTitle('Sprints');
            typeName(0, '  Hill sprint ');
            chooseTime(0, 'minutes', '1');
            chooseTime(0, 'seconds', '30');
            chooseTime(1, 'seconds', '20');
            chooseRounds('6');

            await submit();

            const expected: Timer = {
                id: 1,
                title: 'Sprints',
                steps: [work(90, 'Hill sprint'), rest(20)],
                repeats: 6,
            };
            expect(store.timers()).toEqual([expected]);
            expect(store.activeTimer()).toEqual(expected);
            expect(navigate).toHaveBeenCalledWith(['/timer']);
        });

        it('leaves out steps left at 00:00', async () => {
            chooseTime(0, 'seconds', '30');

            await submit();

            expect(store.timers()[0].steps).toEqual([work(30)]);
        });

        it('resets the form after saving', async () => {
            typeTitle('Sprints');
            chooseTime(0, 'seconds', '30');

            await submit();

            expect(shown().title).toBe('');
            expect(shown().steps[0].time).toBe('0:0');
        });
    });

    describe('steps', () => {
        beforeEach(async () => {
            await setup();
            await create();
        });

        const said = () => el('[aria-live="polite"]').textContent!.trim();

        it('adds work and rest steps at the end, focusing the new name box', async () => {
            await press('Add work');
            await press('Add rest');

            expect(shown().steps.map((s) => s.kind)).toEqual(['Work', 'Rest', 'Work', 'Rest']);
            expect(document.activeElement).toBe(el('input', steps()[3]));
            expect(said()).toBe('Added a rest step, step 4');
        });

        it('runs a round of several steps, saved in order with their names', async () => {
            typeName(0, 'Squats');
            chooseTime(0, 'seconds', '30');
            await press('Add work');
            typeName(2, 'Plank');
            chooseTime(2, 'seconds', '45');
            chooseTime(1, 'seconds', '15');

            await submit();

            expect(store.timers()[0].steps).toEqual([
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
                { kind: 'Work', name: 'Squats', time: '0:30' },
            ]);
            // It's now last, so its down button is disabled: focus goes to its up button
            expect(document.activeElement).toBe(button('Move Step 2, Squats up'));
            expect(said()).toBe('Moved Squats to step 2');
        });

        it('moves a step dropped by drag and drop, and says so', async () => {
            typeName(0, 'Squats');
            chooseTime(0, 'seconds', '30');
            await press('Add work');
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
            expect(button('Move Step 1, work up').disabled).toBe(true);
            expect(button('Move Step 2, rest down').disabled).toBe(true);
            expect(button('Move Step 1, work down').disabled).toBe(false);
        });

        it('deletes a step, focusing the step that takes its place', async () => {
            await press('Add work');
            typeName(2, 'Plank');

            await press('Delete Step 2, rest');

            expect(shown().steps.map((s) => s.name || s.kind)).toEqual(['Work', 'Plank']);
            expect(document.activeElement).toBe(button('Delete Step 2, Plank'));
            expect(said()).toBe('Deleted step 2');
        });

        it('always keeps at least one step', async () => {
            await press('Delete Step 2, rest');

            expect(steps()).toHaveLength(1);
            expect(button('Delete Step 1, work').disabled).toBe(true);
        });

        it(`stops adding at ${MAX_STEPS} steps, and says why`, async () => {
            for (let i = 2; i < MAX_STEPS; i++) {
                await press('Add work');
            }

            expect(steps()).toHaveLength(MAX_STEPS);
            expect(button('Add work').disabled).toBe(true);
            expect(button('Add rest').disabled).toBe(true);
            expect(fixture.nativeElement.textContent).toContain(
                `That's the most steps a timer can have (${MAX_STEPS})`
            );
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

        it('saves a timer that runs until stopped', async () => {
            chooseTime(0, 'seconds', '30');
            toggle().click();
            fixture.detectChanges();

            await submit();

            expect(store.timers()[0].repeats).toBe(UNTIL_STOPPED);
        });
    });

    describe('editing a timer', () => {
        it('fills the form from the timer in ?editId', async () => {
            await setup({ editId: '1' });
            store.addTimer(savedTimer);
            await create();

            expect(shown()).toEqual({
                title: 'Saved timer',
                steps: [
                    { kind: 'Work', name: 'Squats', time: '2:15' },
                    { kind: 'Rest', name: '', time: '0:45' },
                ],
                repeats: '4',
            });
            expect(submitButton().textContent).toContain('Save & Start Timer');
        });

        it('updates the existing timer instead of adding a new one', async () => {
            await setup({ editId: '1' });
            store.addTimer(savedTimer);
            await create();

            typeTitle('Renamed');
            chooseRounds('2');
            await submit();

            expect(store.timers()).toHaveLength(1);
            expect(store.timers()[0]).toEqual({
                id: 1,
                title: 'Renamed',
                steps: savedTimer.steps,
                repeats: 2,
            });
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
