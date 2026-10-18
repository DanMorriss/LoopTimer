import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import axe from 'axe-core';
import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { Timer } from './models/timer';
import { TimerStore } from './shared/state/timer-store.service';

/**
 * Runs axe (WCAG 2.1 A/AA plus best practices) over every page and state of the app,
 * rendered inside the real app shell, so accessibility regressions fail the tests.
 */

const sprints: Timer = {
    id: 1,
    title: 'Sprints',
    timerMinutes: 0,
    timerSeconds: 2,
    restMinutes: 0,
    restSeconds: 2,
    repeats: 2,
    isTimerActive: false,
    isRestActive: false,
    isComplete: false,
};
const untitled: Timer = { ...sprints, id: 2, title: '', timerSeconds: 30 };

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

describe('Accessibility (axe)', () => {
    let fixture: ComponentFixture<AppComponent>;
    let router: Router;
    let store: TimerStore;

    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
        router = TestBed.inject(Router);
        store = TestBed.inject(TimerStore);
        fixture = TestBed.createComponent(AppComponent);
    });

    afterEach(() => {
        fixture.destroy();
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

    describe('setup', () => {
        it('new timer (with the "must have some time" error)', async () => {
            await open('/setup');
            await expectNoViolations();
        });

        it('editing a timer', async () => {
            store.addTimer(sprints);
            await open('/setup?editId=1');
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

        it('paused', async () => {
            store.setActiveTimer(store.addTimer(sprints));
            store.pause();
            await open('/timer');
            expect(fixture.nativeElement.textContent).toContain('Paused');
            await expectNoViolations();
        });
    });
});
