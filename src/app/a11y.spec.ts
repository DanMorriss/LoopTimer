import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import axe from 'axe-core';
import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { makeTimer, rest, work } from './shared/testing/make-timer';
import { HistoryStore } from './shared/state/history-store.service';
import { TimerStore } from './shared/state/timer-store.service';

/**
 * Runs axe (WCAG 2.1 A/AA plus best practices) over every page and state of the app,
 * rendered inside the real app shell, so accessibility regressions fail the tests.
 */

const sprints = makeTimer({ title: 'Sprints', timerSeconds: 2, restSeconds: 2, repeats: 2 });
const untitled = makeTimer({ id: 2, title: '', timerSeconds: 30, restSeconds: 2, repeats: 2 });

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
        let store: TimerStore;

        beforeEach(() => {
            document.documentElement.dataset['theme'] = theme;
            localStorage.clear();
            sessionStorage.clear();
            TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
            router = TestBed.inject(Router);
            store = TestBed.inject(TimerStore);
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

        // Not fixture.whenStable(): the timer page's clock interval means it never settles
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
            it('new timer (with the "must have some time" error)', async () => {
                await open('/setup');
                await expectNoViolations();
            });

            it('with several steps, one of them moved', async () => {
                await open('/setup');
                click('.add-step');
                await settle();
                click('.step:nth-child(3) .step__action');
                await settle();
                await expectNoViolations();
            });

            it('with the until-stopped switch on', async () => {
                await open('/setup');
                click('app-infinity-switch [role="switch"]');
                await settle();
                await expectNoViolations();
            });

            it('editing a timer', async () => {
                store.addTimer(sprints);
                await open('/setup?editId=1');
                await expectNoViolations();
            });

            it('asking before deleting a step', async () => {
                store.addTimer(sprints);
                await open('/setup?editId=1');
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

            it('with timers, including an untitled one', async () => {
                store.addTimer(sprints);
                store.addTimer(untitled);
                await open('/library');
                await expectNoViolations();
            });

            it('with a card selected and its options open', async () => {
                store.addTimer(sprints);
                await open('/library');
                click('.timer-card');
                click('.timer-card__action--menu');
                await settle();
                await expectNoViolations();
            });

            it('with the delete dialog open', async () => {
                store.addTimer(sprints);
                await open('/library');
                click('.timer-card__action--menu');
                await settle();
                click('.timer-card__menu-item--danger');
                await settle();
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
                        timerId: 1,
                        title: i === 1 ? '' : 'Sprints',
                        startedAt: now - i * 86_400_000,
                        endedAt: now - i * 86_400_000 + 60_000,
                        activeSeconds: 60,
                        roundsCompleted: 2,
                        totalRounds: outcome === 'stopped' ? 0 : 2,
                        outcome,
                    });
                }
                await open('/history');
                await expectNoViolations();

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

        describe('timer', () => {
            it('with no timer selected', async () => {
                await open('/timer');
                await expectNoViolations();
            });

            it('during work, rest and once finished', async () => {
                store.setActiveTimer(store.addTimer(sprints)); // 2s work, 2s rest, 2 rounds
                await open('/timer');
                await expectNoViolations();

                await settle(2300);
                expect(fixture.nativeElement.textContent).toContain('Rest');
                await expectNoViolations();

                await settle(4000);
                expect(fixture.nativeElement.textContent).toContain("You're finished!");
                await expectNoViolations();
            }, 15000);

            it('running a round of several named steps', async () => {
                store.setActiveTimer(
                    store.addTimer(
                        makeTimer({ steps: [work(30, 'Squats'), work(45, 'Plank'), rest(20)] })
                    )
                );
                await open('/timer');
                expect(fixture.nativeElement.textContent).toContain('step 1 of 3');
                await expectNoViolations();
            });

            it('running until stopped', async () => {
                store.setActiveTimer(store.addTimer({ ...sprints, repeats: 0 }));
                await open('/timer');
                expect(fixture.nativeElement.textContent).toContain('round 1 of ∞');
                await expectNoViolations();
            });

            it('paused', async () => {
                store.setActiveTimer(store.addTimer(sprints));
                store.pause();
                await open('/timer');
                expect(fixture.nativeElement.textContent).toContain('Paused');
                await expectNoViolations();
            });
        });
    });
}
