import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Workout } from '../models/workout';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { DeletionStore } from '../shared/state/deletion-store.service';
import { UndoService } from '../shared/undo/undo.service';
import { makeWorkout as baseWorkout, SimpleWorkout } from '../shared/testing/make-workout';
import { WorkoutLibraryComponent } from './workout-library.component';

// A new workout to add: the shared test workout without its id
function makeWorkout(overrides: Partial<SimpleWorkout> = {}): Omit<Workout, 'id'> {
    const { id: _id, ...workout } = baseWorkout(overrides);
    return workout;
}

describe('WorkoutLibraryComponent', () => {
    let fixture: ComponentFixture<WorkoutLibraryComponent>;
    let store: WorkoutStore;
    let navigate: Mock;

    beforeEach(async () => {
        localStorage.clear();
        await TestBed.configureTestingModule({
            imports: [WorkoutLibraryComponent],
            providers: [provideRouter([])],
        }).compileComponents();

        store = TestBed.inject(WorkoutStore);
        navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    });

    afterEach(() => localStorage.clear());

    function create() {
        fixture = TestBed.createComponent(WorkoutLibraryComponent);
        fixture.detectChanges();
    }

    function all(selector: string): HTMLElement[] {
        return Array.from(fixture.nativeElement.querySelectorAll(selector));
    }

    function el(selector: string): HTMLElement | null {
        return fixture.nativeElement.querySelector(selector);
    }

    function click(element: HTMLElement | null) {
        expect(element, 'element to click').not.toBeNull();
        element!.click();
        fixture.detectChanges();
    }

    /** Re-render and let after-render hooks (like focus moves) run. */
    async function settle() {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    function text(): string {
        return (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';
    }

    describe('with no workouts', () => {
        beforeEach(() => create());

        it('shows the empty message and no cards', () => {
            expect(text()).toContain('Nothing in the library yet');
            expect(all('.workout-card')).toHaveLength(0);
        });

        it('goes to setup from the "Create a workout" button', () => {
            click(el('.library-create-button'));

            expect(navigate).toHaveBeenCalledWith(['/setup']);
        });

        it('shows only "Create a workout", not "Add workout" as well, so there is one main button', () => {
            expect(all('.btn-main')).toHaveLength(1);
            expect(el('.library-add-button')).toBeNull();
        });
    });

    describe('with workouts', () => {
        let first: Workout;
        let second: Workout;

        beforeEach(() => {
            first = store.addWorkout(
                makeWorkout({
                    title: 'Sprints',
                    workMinutes: 1,
                    workSeconds: 5,
                    restSeconds: 20,
                    repeats: 4,
                })
            );
            second = store.addWorkout(makeWorkout({ title: '   ' }));
            create();
        });

        const card = (index: number) => all('.workout-card')[index];

        it('shows a card per workout with its title and padded times', () => {
            expect(all('.workout-card')).toHaveLength(2);
            expect(text()).not.toContain('Nothing in the library yet');
            expect(card(0).textContent).toContain('Sprints');
            expect(card(0).textContent).toContain('01:05 - 00:20 x 4');
        });

        it('labels a workout with a blank title as "Untitled workout"', () => {
            expect(card(1).textContent).toContain('Untitled workout');
        });

        it('goes to setup from the "Add Workout" button', () => {
            click(el('.library-add-button'));

            expect(navigate).toHaveBeenCalledWith(['/setup']);
        });

        describe('starting a workout', () => {
            const playButton = (index: number) =>
                card(index).querySelector<HTMLElement>('.workout-card__overlay-play')!;
            const isShown = (button: HTMLElement) =>
                button.classList.contains('workout-card__overlay-play--visible');

            it('shows a play button only on the selected card', () => {
                expect(all('.workout-card__overlay-play--visible')).toHaveLength(0);

                click(card(0));

                expect(card(0).classList).toContain('workout-card--active');
                expect(isShown(playButton(0))).toBe(true);
                expect(isShown(playButton(1))).toBe(false);
            });

            it('lets keyboard users reach the play button, selecting its card on focus', () => {
                playButton(1).focus();
                fixture.detectChanges();

                expect(document.activeElement).toBe(playButton(1));
                expect(card(1).classList).toContain('workout-card--active');
                expect(isShown(playButton(1))).toBe(true);
            });

            it('makes the workout active and goes to the workout page', () => {
                click(card(0));
                click(el('.workout-card__overlay-play'));

                expect(store.activeWorkout()).toEqual(first);
                expect(navigate).toHaveBeenCalledWith(['/workout']);
            });

            it('clears the selection when clicking outside the cards', () => {
                click(card(0));

                click(el('.library-screen'));

                expect(el('.workout-card--active')).toBeNull();
                expect(all('.workout-card__overlay-play--visible')).toHaveLength(0);
            });
        });

        describe('options menu', () => {
            const menuButton = (index: number) =>
                card(index).querySelector<HTMLElement>('.workout-card__action--menu');

            it('opens and closes, and reports its state to screen readers', () => {
                expect(menuButton(0)?.getAttribute('aria-expanded')).toBe('false');

                click(menuButton(0));
                expect(card(0).querySelector('.workout-card__menu')).not.toBeNull();
                expect(menuButton(0)?.getAttribute('aria-expanded')).toBe('true');

                click(menuButton(0));
                expect(card(0).querySelector('.workout-card__menu')).toBeNull();
            });

            it('only has one menu open at a time', () => {
                click(menuButton(0));
                click(menuButton(1));

                expect(all('.workout-card__menu')).toHaveLength(1);
                expect(card(1).querySelector('.workout-card__menu')).not.toBeNull();
            });

            it('edits the workout by going to setup with its id', () => {
                click(menuButton(1));
                click(card(1).querySelector('.workout-card__menu-item--edit'));

                expect(navigate).toHaveBeenCalledWith(['/setup'], {
                    queryParams: { editId: second.id },
                });
            });

            it('closes on Escape and puts focus back on its button', async () => {
                click(menuButton(0));
                const editButton = card(0).querySelector<HTMLElement>(
                    '.workout-card__menu-item--edit'
                )!;
                editButton.focus();

                editButton.dispatchEvent(
                    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
                );
                await settle();

                expect(card(0).querySelector('.workout-card__menu')).toBeNull();
                expect(document.activeElement).toBe(menuButton(0));
            });
        });

        describe('deleting', () => {
            const undo = () => TestBed.inject(UndoService);

            function deleteFromMenu(index: number) {
                click(card(index).querySelector('.workout-card__action--menu'));
                click(card(index).querySelector('.workout-card__menu-item--danger'));
            }

            it('deletes straight away, without asking, and offers Undo naming it', () => {
                deleteFromMenu(0);

                expect(el('[role="dialog"]')).toBeNull();
                expect(store.workouts()).toEqual([second]);
                expect(all('.workout-card')).toHaveLength(1);
                expect(JSON.parse(localStorage.getItem('workouts')!)).toEqual([second]);
                expect(undo().offer()?.message).toBe('Deleted "Sprints"');
            });

            it('describes an untitled workout without empty quotes', () => {
                deleteFromMenu(1);

                expect(undo().offer()?.message).toBe('Deleted a workout');
            });

            it('puts it back where it was on Undo, with focus on its menu', async () => {
                deleteFromMenu(0);

                undo().undo();
                await settle();

                expect(store.workouts()).toEqual([first, second]);
                expect(JSON.parse(localStorage.getItem('workouts')!)).toEqual([first, second]);
                expect(
                    TestBed.inject(DeletionStore).deletedAt('workout', first.id)
                ).toBeUndefined();
                expect(document.activeElement).toBe(
                    card(0).querySelector('.workout-card__action--menu')
                );
            });

            it('shows the empty message once the last workout is deleted', () => {
                deleteFromMenu(0);
                deleteFromMenu(0);

                expect(text()).toContain('Nothing in the library yet');
                expect(undo().offer()?.message).toBe('Deleted a workout');
            });

            describe('closing the offer without undoing', () => {
                it('moves focus to "Add workout"', async () => {
                    deleteFromMenu(0);

                    undo().dismiss();
                    await settle();

                    expect(document.activeElement).toBe(el('.library-add-button'));
                });

                it('moves focus to "Create a workout" once the library is empty', async () => {
                    deleteFromMenu(0);
                    deleteFromMenu(0);

                    undo().dismiss();
                    await settle();

                    expect(document.activeElement).toBe(el('.library-create-button'));
                });
            });
        });
    });
});
