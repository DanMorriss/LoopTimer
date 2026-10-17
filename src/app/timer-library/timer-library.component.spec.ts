import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Timer } from '../models/timer';
import { TimerStore } from '../shared/state/timer-store.service';
import { TimerLibraryComponent } from './timer-library.component';

function makeTimer(overrides: Partial<Omit<Timer, 'id'>> = {}): Omit<Timer, 'id'> {
  return {
    title: 'Intervals',
    timerMinutes: 0,
    timerSeconds: 30,
    restMinutes: 0,
    restSeconds: 10,
    repeats: 3,
    isTimerActive: false,
    isRestActive: false,
    isComplete: false,
    ...overrides
  };
}

describe('TimerLibraryComponent', () => {
  let fixture: ComponentFixture<TimerLibraryComponent>;
  let store: TimerStore;
  let navigate: jasmine.Spy;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [TimerLibraryComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    store = TestBed.inject(TimerStore);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => localStorage.clear());

  function create() {
    fixture = TestBed.createComponent(TimerLibraryComponent);
    fixture.detectChanges();
  }

  function all(selector: string): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll(selector));
  }

  function el(selector: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(selector);
  }

  function click(element: HTMLElement | null) {
    expect(element).withContext('element to click').not.toBeNull();
    element!.click();
    fixture.detectChanges();
  }

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';
  }

  describe('with no timers', () => {
    beforeEach(() => create());

    it('shows the empty message and no cards', () => {
      expect(text()).toContain('Nothing in the library yet');
      expect(all('.timer-card')).toHaveSize(0);
    });

    it('goes to setup from the "Create a timer" button', () => {
      click(el('app-infinity-button button'));

      expect(navigate).toHaveBeenCalledWith(['/setup']);
    });
  });

  describe('with timers', () => {
    let first: Timer;
    let second: Timer;

    beforeEach(() => {
      first = store.addTimer(makeTimer({ title: 'Sprints', timerMinutes: 1, timerSeconds: 5, restSeconds: 20, repeats: 4 }));
      second = store.addTimer(makeTimer({ title: '   ' }));
      create();
    });

    const card = (index: number) => all('.timer-card')[index];

    it('shows a card per timer with its title and padded times', () => {
      expect(all('.timer-card')).toHaveSize(2);
      expect(text()).not.toContain('Nothing in the library yet');
      expect(card(0).textContent).toContain('Sprints');
      expect(card(0).textContent).toContain('01:05 - 00:20 x 4');
    });

    it('labels a timer with a blank title as "Untitled timer"', () => {
      expect(card(1).textContent).toContain('Untitled timer');
    });

    it('goes to setup from the "Add Timer" button', () => {
      click(el('.library-add-button'));

      expect(navigate).toHaveBeenCalledWith(['/setup']);
    });

    describe('starting a timer', () => {
      it('shows a play button only on the selected card', () => {
        expect(el('.timer-card__overlay-play')).toBeNull();

        click(card(0));

        expect(card(0).classList).toContain('timer-card--active');
        expect(card(0).querySelector('.timer-card__overlay-play')).not.toBeNull();
        expect(card(1).querySelector('.timer-card__overlay-play')).toBeNull();
      });

      it('makes the timer active and goes to the timer page', () => {
        click(card(0));
        click(el('.timer-card__overlay-play'));

        expect(store.activeTimer()).toEqual(first);
        expect(navigate).toHaveBeenCalledWith(['/timer']);
      });

      it('clears the selection when clicking outside the cards', () => {
        click(card(0));

        click(el('.library-screen'));

        expect(el('.timer-card--active')).toBeNull();
        expect(el('.timer-card__overlay-play')).toBeNull();
      });
    });

    describe('options menu', () => {
      const menuButton = (index: number) => card(index).querySelector<HTMLElement>('.timer-card__action--menu');

      it('opens and closes, and reports its state to screen readers', () => {
        expect(menuButton(0)?.getAttribute('aria-expanded')).toBe('false');

        click(menuButton(0));
        expect(card(0).querySelector('[role="menu"]')).not.toBeNull();
        expect(menuButton(0)?.getAttribute('aria-expanded')).toBe('true');

        click(menuButton(0));
        expect(card(0).querySelector('[role="menu"]')).toBeNull();
      });

      it('only has one menu open at a time', () => {
        click(menuButton(0));
        click(menuButton(1));

        expect(all('[role="menu"]')).toHaveSize(1);
        expect(card(1).querySelector('[role="menu"]')).not.toBeNull();
      });

      it('edits the timer by going to setup with its id', () => {
        click(menuButton(1));
        click(card(1).querySelector('[role="menuitem"]'));

        expect(navigate).toHaveBeenCalledWith(['/setup'], { queryParams: { editId: second.id } });
      });
    });

    describe('deleting', () => {
      function requestDelete(index: number) {
        click(card(index).querySelector('.timer-card__action--menu'));
        click(card(index).querySelector('.timer-card__menu-item--danger'));
      }

      it('asks for confirmation, naming the timer', () => {
        requestDelete(0);

        expect(el('[role="dialog"]')).not.toBeNull();
        expect(el('[role="dialog"]')?.textContent).toContain('"Sprints"');
        expect(store.timers()).toHaveSize(2);
      });

      it('keeps the timer when cancelled', () => {
        requestDelete(0);

        click(el('.confirm-dialog__button--cancel'));

        expect(el('[role="dialog"]')).toBeNull();
        expect(store.timers()).toHaveSize(2);
      });

      it('keeps the timer when clicking the backdrop', () => {
        requestDelete(0);

        click(el('.confirm-overlay'));

        expect(el('[role="dialog"]')).toBeNull();
        expect(store.timers()).toHaveSize(2);
      });

      it('removes the timer when confirmed', () => {
        requestDelete(0);

        click(el('.confirm-dialog__button--delete'));

        expect(el('[role="dialog"]')).toBeNull();
        expect(store.timers()).toEqual([second]);
        expect(all('.timer-card')).toHaveSize(1);
        expect(JSON.parse(localStorage.getItem('timers')!)).toEqual([second]);
      });

      it('shows the empty message once the last timer is deleted', () => {
        requestDelete(0);
        click(el('.confirm-dialog__button--delete'));
        requestDelete(0);
        click(el('.confirm-dialog__button--delete'));

        expect(text()).toContain('Nothing in the library yet');
      });
    });
  });
});
