import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { injectPrefersReducedMotion } from './reduced-motion';
import { fakeReducedMotion } from './testing/fake-reduced-motion';

@Component({ template: '' })
class UsesReducedMotion {
  reduced = injectPrefersReducedMotion();
}

describe('injectPrefersReducedMotion', () => {
  it('reflects the current setting', () => {
    fakeReducedMotion(true);

    expect(TestBed.createComponent(UsesReducedMotion).componentInstance.reduced()).toBeTrue();
  });

  it('follows changes to the setting while the page is open', () => {
    const motion = fakeReducedMotion(false);
    const component = TestBed.createComponent(UsesReducedMotion).componentInstance;
    expect(component.reduced()).toBeFalse();

    motion.set(true);

    expect(component.reduced()).toBeTrue();
  });

  it('stops listening when its component is destroyed', () => {
    const motion = fakeReducedMotion(false);
    const fixture = TestBed.createComponent(UsesReducedMotion);
    expect(motion.listenerCount()).toBe(1);

    fixture.destroy();

    expect(motion.listenerCount()).toBe(0);
  });
});
