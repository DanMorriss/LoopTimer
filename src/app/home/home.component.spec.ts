import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { HomeComponent } from './home.component';
import { fakeReducedMotion } from '../shared/testing/fake-reduced-motion';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Real links, so they can be reached and followed with the keyboard
  it('links to setup from the "Create" side of the logo', () => {
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a.left-zone');

    expect(link.textContent?.trim()).toBe('Create');
    expect(link.getAttribute('href')).toBe('/setup');
  });

  it('links to the library from the "Library" side of the logo', () => {
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a.right-zone');

    expect(link.textContent?.trim()).toBe('Library');
    expect(link.getAttribute('href')).toBe('/library');
  });

  describe('with reduced motion', () => {
    function render(reduced: boolean) {
      const motion = fakeReducedMotion(reduced);
      const home = TestBed.createComponent(HomeComponent);
      home.detectChanges();
      return { home, motion, dot: () => home.nativeElement.querySelector('.light-dot').parentElement as SVGGElement };
    }

    it('moves the dot round the logo normally', () => {
      const { home, dot } = render(false);

      expect(home.nativeElement.querySelector('animateMotion')).not.toBeNull();
      expect(dot().getAttribute('transform')).toBeNull();
    });

    it('rests the dot where the loops cross instead', () => {
      const { home, dot } = render(true);

      expect(home.nativeElement.querySelector('animateMotion')).toBeNull();
      expect(dot().getAttribute('transform')).toBe('translate(100 50)');
    });

    it('stops the dot if the setting is turned on while the page is open', () => {
      const { home, motion } = render(false);

      motion.set(true);
      home.detectChanges();

      expect(home.nativeElement.querySelector('animateMotion')).toBeNull();
    });
  });
});
