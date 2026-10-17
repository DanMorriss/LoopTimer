import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
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
  isComplete: false
};

describe('TimerSetupComponent', () => {
  let component: TimerSetupComponent;
  let fixture: ComponentFixture<TimerSetupComponent>;
  let store: TimerStore;
  let navigate: jasmine.Spy;

  async function setup(queryParams: Record<string, string> = {}) {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [TimerSetupComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } }
        }
      ]
    }).compileComponents();

    store = TestBed.inject(TimerStore);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  }

  function create() {
    fixture = TestBed.createComponent(TimerSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function el<T extends HTMLElement>(selector: string): T {
    return fixture.nativeElement.querySelector(selector);
  }

  /** Pick an option in a <select>, the way a user would. */
  function choose(id: string, value: string) {
    const select = el<HTMLSelectElement>(`#${id}`);
    select.value = value;
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

  function submit() {
    el<HTMLFormElement>('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  afterEach(() => localStorage.clear());

  describe('creating a timer', () => {
    beforeEach(async () => {
      await setup();
      create();
    });

    it('starts with an empty form', () => {
      expect(component.timerForm.getRawValue()).toEqual({
        title: '',
        timerMinutes: 0,
        timerSeconds: 0,
        restMinutes: 0,
        restSeconds: 0,
        repeats: 1
      });
      expect(submitButton().textContent).toContain('Start Timer');
      expect(submitButton().textContent).not.toContain('Save');
    });

    it('will not start a timer with no work time', () => {
      expect(submitButton().disabled).toBeTrue();
      expect(fixture.nativeElement.textContent).toContain('Timer must have some time');

      submit();

      expect(store.timers()).toEqual([]);
      expect(navigate).not.toHaveBeenCalled();
    });

    it('allows a timer with only seconds, or only minutes', () => {
      choose('timerSeconds', '5');
      expect(submitButton().disabled).toBeFalse();
      expect(fixture.nativeElement.textContent).not.toContain('Timer must have some time');

      choose('timerSeconds', '0');
      choose('timerMinutes', '1');
      expect(submitButton().disabled).toBeFalse();
    });

    it('saves the timer with numbers, makes it active, and goes to the timer', () => {
      type('title', 'Sprints');
      choose('timerMinutes', '1');
      choose('timerSeconds', '30');
      choose('restMinutes', '0');
      choose('restSeconds', '20');
      choose('repeats', '6');

      submit();

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
        isComplete: false
      };
      expect(store.timers()).toEqual([expected]);
      expect(store.activeTimer()).toEqual(expected);
      expect(navigate).toHaveBeenCalledWith(['/timer']);
    });

    it('resets the form after saving', () => {
      type('title', 'Sprints');
      choose('timerSeconds', '30');

      submit();

      expect(component.timerForm.getRawValue().title).toBe('');
      expect(component.timerForm.getRawValue().timerSeconds).toBe(0);
    });
  });

  describe('editing a timer', () => {
    it('fills the form from the timer in ?editId', async () => {
      await setup({ editId: '1' });
      store.addTimer(savedTimer);
      create();

      expect(component.timerForm.getRawValue()).toEqual({
        title: 'Saved timer',
        timerMinutes: 2,
        timerSeconds: 15,
        restMinutes: 0,
        restSeconds: 45,
        repeats: 4
      });
      expect(submitButton().textContent).toContain('Save & Start Timer');
    });

    it('updates the existing timer instead of adding a new one', async () => {
      await setup({ editId: '1' });
      store.addTimer(savedTimer);
      create();

      type('title', 'Renamed');
      choose('repeats', '2');
      submit();

      expect(store.timers()).toHaveSize(1);
      expect(store.timers()[0]).toEqual(jasmine.objectContaining({ id: 1, title: 'Renamed', repeats: 2 }));
      expect(store.activeTimer()?.id).toBe(1);
      expect(navigate).toHaveBeenCalledWith(['/timer']);
    });

    for (const editId of ['abc', '0', '-1', '1.5', '99']) {
      it(`ignores an invalid or unknown editId of "${editId}"`, async () => {
        await setup({ editId });
        store.addTimer(savedTimer);
        create();

        expect(component.timerForm.getRawValue().title).toBe('');
        expect(submitButton().textContent).not.toContain('Save');
      });
    }
  });
});
