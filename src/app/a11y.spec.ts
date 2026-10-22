import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import axe from 'axe-core';
import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { makeWorkout, reps, rest, work } from './shared/testing/make-workout';
import { ExerciseStore } from './shared/state/exercise-store.service';
import { HistoryStore } from './shared/state/history-store.service';
import { WorkoutStore } from './shared/state/workout-store.service';

/**
 * Runs axe (WCAG 2.1 A/AA plus best practices) over every page and state of the app,
 * rendered inside the real app shell, so accessibility regressions fail the tests.
 */

const sprints = makeWorkout({ title: 'Sprints', workSeconds: 2, restSeconds: 2, repeats: 2 });
const untitled = makeWorkout({
    id: 'workout-2',
    title: '',
    workSeconds: 30,
    restSeconds: 2,
    repeats: 2,
});

// These rules look at the whole document (one <main>, one <h1>, everything inside a
// landmark). The test page around the app isn't ours, so they're left to the
// real-browser checks; the app shell provides <header>, <main> and the <h1>.
const DOCUMENT_LEVEL_RULES = [
    'region',
    'landmark-one-main',
    'page-has-heading-one',
    'html-has-lang',
    'document-title',
];

// Every page and state is checked in both themes, so neither can fall below WCAG AA
for (const theme of ['dark', 'light'] as const) {
    describe(`Accessibility (axe), ${theme} theme`, () => {
        let fixture: ComponentFixture<AppComponent>;
        let router: Router;
        let store: WorkoutStore;

        beforeEach(() => {
            document.documentElement.dataset['theme'] = theme;
            localStorage.clear();
            sessionStorage.clear();
            TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
            router = TestBed.inject(Router);
            store = TestBed.inject(WorkoutStore);
            fixture = TestBed.createComponent(AppComponent);
        });

        afterEach(() => {
            fixture.destroy();
            delete document.documentElement.dataset['theme'];
            localStorage.clear();
            sessionStorage.clear();
        });

        async function open(url: string) {
            await router.navigateByUrl(url);
            await settle();
        }

        // Not fixture.whenStable(): the workout page's clock interval means it never settles
        async function settle(ms = 50) {
            fixture.detectChanges();
            await new Promise((resolve) => setTimeout(resolve, ms));
            fixture.detectChanges();
        }

        function click(selector: string) {
            const element = fixture.nativeElement.querySelector(selector) as HTMLElement | null;
            expect(element, `expected to find ${selector}`).not.toBeNull();
            element!.click();
        }

        async function expectNoViolations() {
            const results = await axe.run(fixture.nativeElement as HTMLElement, {
                runOnly: {
                    type: 'tag',
                    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
                },
                rules: Object.fromEntries(
                    DOCUMENT_LEVEL_RULES.map((rule) => [rule, { enabled: false }])
                ),
            });
            const report = results.violations.map(
                (v) =>
                    `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.map((n) => n.target.join(' ')).join('\n    ')}`
            );
            expect(report, 'axe violations').toEqual([]);
        }

        it('home', async () => {
            await open('/home');
            await expectNoViolations();
        });

        it('with the menu open', async () => {
            await open('/library');
            click('button[aria-label="Menu"]');
            await settle(300); // past the menu's fade-in, which axe would see as low contrast
            await expectNoViolations();
        });

        describe('setup', () => {
            it('new workout, with no steps', async () => {
                await open('/setup');
                await expectNoViolations();
            });

            it('with an empty step (and the "needs a timed step" error)', async () => {
                await open('/setup');
                click('.add-step');
                await settle();
                await expectNoViolations();
            });

            it('with several steps, one of them moved', async () => {
                await open('/setup');
                click('.add-step');
                await settle();
                click('.add-step--rest');
                await settle();
                click('.add-step');
                await settle();
                click('.step:nth-child(3) .step__action');
                await settle();
                await expectNoViolations();
            });

            it('with a rep step added', async () => {
                await open('/setup');
                click('.add-step--reps');
                await settle();
                await expectNoViolations();
            });

            it('with the until-stopped switch on', async () => {
                await open('/setup');
                click('app-infinity-switch [role="switch"]');
                await settle();
                await expectNoViolations();
            });

            it('editing a workout', async () => {
                const saved = store.addWorkout(sprints);
                await open('/setup?editId=' + saved.id);
                await expectNoViolations();
            });

            it('asking before deleting a step', async () => {
                const saved = store.addWorkout(sprints);
                await open('/setup?editId=' + saved.id);
                click('.step__toggle');
                await settle();
                click('.step__action--delete');
                await settle();
                await expectNoViolations();
            });
        });

        describe('library', () => {
            it('empty', async () => {
                await open('/library');
                await expectNoViolations();
            });

            it('with workouts, including an untitled one', async () => {
                store.addWorkout(sprints);
                store.addWorkout(untitled);
                await open('/library');
                await expectNoViolations();
            });

            it('with a card selected and its options open', async () => {
                store.addWorkout(sprints);
                await open('/library');
                click('.workout-card');
                click('.workout-card__action--menu');
                await settle();
                await expectNoViolations();
            });

            it('with the delete dialog open', async () => {
                store.addWorkout(sprints);
                await open('/library');
                click('.workout-card__action--menu');
                await settle();
                click('.workout-card__menu-item--danger');
                await settle();
                await expectNoViolations();
            });
        });

        describe('exercises', () => {
            it('the list, with the equipment open, one hidden and one of your own', async () => {
                const exercises = TestBed.inject(ExerciseStore);
                exercises.addOwn('Sled push', 'reps');
                exercises.setHidden('builtin:plank', true);
                await open('/exercises');
                click('.exercises__kit-edit');
                click('.exercises__hidden-toggle');
                await settle();
                await expectNoViolations();
            });

            it('the list, with nothing matching', async () => {
                await open('/exercises');
                const box = fixture.nativeElement.querySelector('#exercise-search');
                box.value = 'zzz';
                box.dispatchEvent(new Event('input'));
                await settle();
                await expectNoViolations();
            });

            it('making a new exercise', async () => {
                await open('/exercises');
                click('#exercise-list-new');
                await settle();
                await expectNoViolations();
            });

            it('a built-in exercise, with your note, hidden', async () => {
                const exercises = TestBed.inject(ExerciseStore);
                exercises.setNote('builtin:inverted-row', 'Feet on a box');
                exercises.setHidden('builtin:inverted-row', true);
                await open('/exercises/inverted-row');
                await expectNoViolations();
            });

            it('your own exercise, being edited with errors', async () => {
                const mine = TestBed.inject(ExerciseStore).addOwn('Sled push', 'reps');
                await open(`/exercises/${mine.id}`);
                click('#exercise-page-edit');
                await settle();
                const name = fixture.nativeElement.querySelector('#exercise-editor-name');
                name.value = '';
                name.dispatchEvent(new Event('input'));
                const steps = fixture.nativeElement.querySelector('#exercise-editor-steps');
                steps.value = Array.from({ length: 20 }, () => 'Step').join('\n');
                steps.dispatchEvent(new Event('input'));
                await settle();
                await expectNoViolations();
            });

            it('your own exercise, asking before deleting it, and in use', async () => {
                const mine = TestBed.inject(ExerciseStore).addOwn('Sled push', 'reps');
                await open(`/exercises/${mine.id}`);
                click('#exercise-page-delete');
                await settle();
                await expectNoViolations();
                click('.confirm-dialog__button--cancel');
                store.addWorkout(
                    makeWorkout({
                        steps: [{ kind: 'reps', reps: 5, name: 'Sled push', exerciseId: mine.id }],
                    })
                );
                click('#exercise-page-delete');
                await settle();
                await expectNoViolations();
            });

            it('an exercise that is not there', async () => {
                await open('/exercises/not-one');
                await expectNoViolations();
            });
        });

        describe('history', () => {
            it('with no workouts yet', async () => {
                await open('/history');
                await expectNoViolations();
            });

            it('with workouts, and after deleting one', async () => {
                const now = Date.now();
                for (const [i, outcome] of (
                    ['finished', 'stopped', 'finished'] as const
                ).entries()) {
                    TestBed.inject(HistoryStore).record({
                        id: 'run-' + i,
                        workoutId: 'workout-1',
                        title: i === 1 ? '' : 'Sprints',
                        startedAt: now - i * 86_400_000,
                        endedAt: now - i * 86_400_000 + 60_000,
                        activeSeconds: 60,
                        roundsCompleted: 2,
                        totalRounds: outcome === 'stopped' ? 0 : 2,
                        outcome,
                        ...(i === 0
                            ? {
                                  sets: [
                                      { round: 0, step: 0, name: 'Squats', reps: 10, weight: 60 },
                                  ],
                              }
                            : {}),
                    });
                }
                await open('/history');
                await expectNoViolations();

                click('.entry__menu-button');
                await settle();
                await expectNoViolations();

                click('.entry__edit-note');
                await settle();
                await expectNoViolations();

                click('.entry__menu-button');
                await settle();
                click('.entry__delete');
                await settle();
                await expectNoViolations();
            });
        });

        describe('settings', () => {
            it('as first opened', async () => {
                await open('/settings');
                await expectNoViolations();
            });

            it('with sound turned off', async () => {
                await open('/settings');
                click('[role="switch"][aria-labelledby="sound-label"]');
                await settle();
                await expectNoViolations();
            });
        });

        describe('workout', () => {
            it('with no workout selected', async () => {
                await open('/workout');
                await expectNoViolations();
            });

            it('during work, rest and once finished', async () => {
                store.setActiveWorkout(store.addWorkout(sprints)); // 2s work, 2s rest, 2 rounds
                await open('/workout');
                await expectNoViolations();

                await settle(2300);
                expect(fixture.nativeElement.textContent).toContain('Rest');
                await expectNoViolations();

                await settle(4000);
                expect(fixture.nativeElement.textContent).toContain("You're finished!");
                await expectNoViolations();
            }, 15000);

            it('running a round of several named steps', async () => {
                store.setActiveWorkout(
                    store.addWorkout(
                        makeWorkout({ steps: [work(30, 'Squats'), work(45, 'Plank'), rest(20)] })
                    )
                );
                await open('/workout');
                expect(fixture.nativeElement.textContent).toContain('step 1 of 3');
                await expectNoViolations();
            });

            it('waiting on a rep step', async () => {
                store.setActiveWorkout(
                    store.addWorkout(makeWorkout({ steps: [reps(20, 'Push-ups'), work(30)] }))
                );
                await open('/workout');
                expect(fixture.nativeElement.textContent).toContain('20');
                expect(fixture.nativeElement.textContent).toContain('Done');
                await expectNoViolations();
            });

            it('changing the reps or weight of a rep step', async () => {
                store.setActiveWorkout(
                    store.addWorkout(
                        makeWorkout({
                            steps: [{ kind: 'reps', reps: 10, name: 'Squats', weight: 60 }],
                        })
                    )
                );
                await open('/workout');
                click('.workout-change');
                await settle();
                expect(fixture.nativeElement.querySelector('#workout-change-panel')).not.toBeNull();
                await expectNoViolations();
            });

            it('running until stopped', async () => {
                store.setActiveWorkout(store.addWorkout({ ...sprints, repeats: 0 }));
                await open('/workout');
                expect(fixture.nativeElement.textContent).toContain('round 1 of ∞');
                await expectNoViolations();
            });

            it('paused', async () => {
                store.setActiveWorkout(store.addWorkout(sprints));
                store.pause();
                await open('/workout');
                expect(fixture.nativeElement.textContent).toContain('Paused');
                await expectNoViolations();
            });
        });
    });
}
