import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Timer } from '../models/timer';
import { TimerStore } from '../shared/state/timer-store.service';
import { TimerComponent } from './timer.component';

function makeTimer(overrides: Partial<Timer> = {}): Timer {
  return {
    id: 1,
    title: 'Intervals',
    timerMinutes: 0,
    timerSeconds: 3,
    restMinutes: 0,
    restSeconds: 2,
    repeats: 2,
    isTimerActive: false,
    isRestActive: false,
    isComplete: false,
    ...overrides
  };
}

describe('TimerComponent', () => {
  let component: TimerComponent;
  let fixture: ComponentFixture<TimerComponent>;
  let store: TimerStore;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [TimerComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    store = TestBed.inject(TimerStore);
  });

  afterEach(() => sessionStorage.clear());

  function start(timer: Timer) {
    store.setActiveTimer(timer);
    fixture = TestBed.createComponent(TimerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  /** Advance the fake clock and re-render. */
  function advance(ms: number) {
    tick(ms);
    fixture.detectChanges();
  }

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';
  }

  it('points to the library and runs no countdown when there is no active timer', fakeAsync(() => {
    fixture = TestBed.createComponent(TimerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isTimerActive()).toBeFalse();
    expect(component.isRestActive()).toBeFalse();
    expect(text()).toContain('No timer selected');
    expect(fixture.nativeElement.querySelector('.timer-ring')).toBeNull();
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
    expect(link.getAttribute('href')).toBe('/library');
    fixture.destroy();
  }));

  describe('work phase', () => {
    it('starts with the work time showing, zero-padded', fakeAsync(() => {
      start(makeTimer({ timerMinutes: 1, timerSeconds: 5 }));

      expect(component.isTimerActive()).toBeTrue();
      expect(text()).toContain('01:05');
      fixture.destroy();
    }));

    it('counts down one second per tick', fakeAsync(() => {
      start(makeTimer());

      advance(1000);
      expect(text()).toContain('00:02');

      advance(1000);
      expect(text()).toContain('00:01');
      fixture.destroy();
    }));

    it('rolls minutes over into 59 seconds', fakeAsync(() => {
      start(makeTimer({ timerMinutes: 1, timerSeconds: 0 }));

      advance(1000);

      expect(text()).toContain('00:59');
      fixture.destroy();
    }));

    it('reports progress through the work phase', fakeAsync(() => {
      start(makeTimer({ timerSeconds: 4 }));
      expect(component.progress()).toBe(0);

      advance(2000);

      expect(component.progress()).toBe(0.5);
      fixture.destroy();
    }));
  });

  describe('rest phase', () => {
    it('switches to rest exactly when the work time runs out', fakeAsync(() => {
      start(makeTimer({ timerSeconds: 3, restSeconds: 2 }));

      advance(2999);
      expect(component.isTimerActive()).toBeTrue();

      advance(1);
      expect(component.isTimerActive()).toBeFalse();
      expect(component.isRestActive()).toBeTrue();
      expect(text()).toContain('Rest');
      expect(text()).toContain('00:02');
      fixture.destroy();
    }));

    it('starts the next round exactly when the rest time runs out', fakeAsync(() => {
      start(makeTimer({ timerSeconds: 3, restSeconds: 2, repeats: 2 }));

      advance(3000 + 2000);

      expect(component.isRestActive()).toBeFalse();
      expect(component.isTimerActive()).toBeTrue();
      expect(component.repeats()).toBe(1);
      expect(text()).toContain('00:03');
      fixture.destroy();
    }));

    it('skips rest entirely when the rest time is zero', fakeAsync(() => {
      start(makeTimer({ timerSeconds: 3, restSeconds: 0, repeats: 2 }));

      advance(3000);

      expect(component.isRestActive()).toBeFalse();
      expect(component.isTimerActive()).toBeTrue();
      expect(component.repeats()).toBe(1);
      expect(text()).toContain('00:03');
      fixture.destroy();
    }));
  });

  describe('finishing', () => {
    it('finishes right after the last work phase, with no trailing rest', fakeAsync(() => {
      start(makeTimer({ timerSeconds: 3, restSeconds: 2, repeats: 1 }));

      advance(3000);

      expect(component.isComplete()).toBeTrue();
      expect(component.isRestActive()).toBeFalse();
      expect(component.progress()).toBe(1);
      expect(text()).toContain("You're finished!");
      fixture.destroy();
    }));

    it('takes exactly work + rest + work for two rounds', fakeAsync(() => {
      start(makeTimer({ timerSeconds: 3, restSeconds: 2, repeats: 2 }));

      advance(3000 + 2000 + 3000 - 1);
      expect(component.isComplete()).toBeFalse();

      advance(1);
      expect(component.isComplete()).toBeTrue();
      fixture.destroy();
    }));

    it('stops counting once finished', fakeAsync(() => {
      start(makeTimer({ timerSeconds: 1, repeats: 1 }));

      advance(1000);
      advance(10_000);

      expect(component.isComplete()).toBeTrue();
      expect(component.isTimerActive()).toBeFalse();
      expect(component.isRestActive()).toBeFalse();
      fixture.destroy();
    }));
  });

  describe('repeats display', () => {
    it('shows one marker per remaining round', fakeAsync(() => {
      start(makeTimer({ repeats: 3 }));

      const markers = fixture.nativeElement.querySelectorAll('.rubik-spray-paint-regular');
      expect(markers).toHaveSize(3);
      fixture.destroy();
    }));

    it('says "Last one!" during the final work phase', fakeAsync(() => {
      start(makeTimer({ timerSeconds: 3, restSeconds: 0, repeats: 2 }));
      expect(text()).not.toContain('Last one!');

      advance(3000);

      expect(text()).toContain('Last one!');
      fixture.destroy();
    }));
  });

  it('restarts from the beginning when a different timer is made active', fakeAsync(() => {
    start(makeTimer({ timerSeconds: 10 }));
    advance(4000);

    store.setActiveTimer(makeTimer({ id: 2, title: 'Second', timerSeconds: 20 }));
    fixture.detectChanges();

    expect(text()).toContain('Second');
    expect(text()).toContain('00:20');
    advance(1000);
    expect(text()).toContain('00:19');
    fixture.destroy();
  }));

  it('shows only the work phase when a different timer is made active during rest', fakeAsync(() => {
    start(makeTimer({ timerSeconds: 3, restSeconds: 5 }));
    advance(3000);
    expect(component.isRestActive()).toBeTrue();

    store.setActiveTimer(makeTimer({ id: 2, title: 'Second', timerSeconds: 20 }));
    fixture.detectChanges();

    expect(component.isTimerActive()).toBeTrue();
    expect(component.isRestActive()).toBeFalse();
    expect(text()).not.toContain('Rest');
    expect(fixture.nativeElement.querySelector('.timer-ring').classList).not.toContain('anticlockwise');
    fixture.destroy();
  }));

  it('picks the active timer back up after a page refresh', fakeAsync(() => {
    // Simulate a refresh: the timer was saved and made active in a previous page load
    localStorage.setItem('timers', JSON.stringify([makeTimer({ id: 7, title: 'Saved', timerSeconds: 30 })]));
    sessionStorage.setItem('activeTimerId', '7');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [TimerComponent], providers: [provideRouter([])] });

    fixture = TestBed.createComponent(TimerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(text()).toContain('Saved');
    expect(text()).toContain('00:30');
    advance(1000);
    expect(text()).toContain('00:29');
    fixture.destroy();
    localStorage.clear();
  }));

  it('stops its intervals when destroyed', fakeAsync(() => {
    start(makeTimer());
    advance(1000);

    fixture.destroy();

    // fakeAsync fails the test if any interval is still scheduled at this point
    expect(component.isTimerActive()).toBeTrue();
  }));
});
