import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { fakeReducedMotion } from '../shared/testing/fake-reduced-motion';
import { FADING_CLASS, PageSlide, SLIDING_CLASS } from './page-slide';

@Component({ template: '' })
class BlankPage {}

describe('PageSlide', () => {
    let slide: PageSlide;
    let router: Router;
    const root = document.documentElement;

    beforeEach(async () => {
        TestBed.configureTestingModule({
            providers: [provideRouter([{ path: '**', component: BlankPage }])],
        });
        slide = TestBed.inject(PageSlide);
        router = TestBed.inject(Router);
        await router.navigateByUrl('/exercises');
    });

    afterEach(() =>
        root.classList.remove(
            SLIDING_CLASS,
            `${SLIDING_CLASS}--in`,
            `${SLIDING_CLASS}--out`,
            FADING_CLASS
        )
    );

    const click = (init: MouseEventInit = {}) =>
        new MouseEvent('click', { button: 0, cancelable: true, ...init });

    /** Waits for the navigation inside the view transition to land. */
    const landed = (url: string) =>
        vi.waitFor(() => expect(router.url).toBe(url), { timeout: 2000 });

    it('goes into an exercise inside a view transition, marking which way it goes', async () => {
        fakeReducedMotion(false);
        const start = vi.spyOn(document, 'startViewTransition');
        const event = click();

        slide.follow(event, '/exercises/back-squat', 'in');

        expect(event.defaultPrevented).toBe(true);
        expect(start).toHaveBeenCalledTimes(1);
        expect(root.classList).toContain(SLIDING_CLASS);
        expect(root.classList).toContain(`${SLIDING_CLASS}--in`);
        await landed('/exercises/back-squat');
    });

    it('marks going back as out, and keeps the address it goes back to', async () => {
        fakeReducedMotion(false);

        slide.follow(click(), '/exercises?muscles=quads', 'out');

        expect(root.classList).toContain(`${SLIDING_CLASS}--out`);
        await landed('/exercises?muscles=quads');
    });

    it("carries on at a swipe's speed, and takes it and the names off once it's over", async () => {
        fakeReducedMotion(false);
        const start = vi.spyOn(document, 'startViewTransition');

        slide.navigate('/exercises', 'out', 1500);

        expect(root.style.getPropertyValue('--slide-duration')).toMatch(/^\d+ms$/);
        expect(root.style.getPropertyValue('--slide-easing')).not.toBe('');
        await start.mock.results[0].value.finished;
        expect(root.classList).not.toContain(SLIDING_CLASS);
        expect(root.classList).not.toContain(`${SLIDING_CLASS}--out`);
        expect(root.style.getPropertyValue('--slide-duration')).toBe('');
        expect(root.style.getPropertyValue('--slide-easing')).toBe('');
    });

    it('leaves a click for a new tab or window to the browser', () => {
        fakeReducedMotion(false);
        const start = vi.spyOn(document, 'startViewTransition');

        for (const init of [
            { metaKey: true },
            { ctrlKey: true },
            { shiftKey: true },
            { button: 1 },
        ]) {
            const event = click(init);
            slide.follow(event, '/exercises/back-squat', 'in');
            expect(event.defaultPrevented).toBe(false);
        }

        expect(start).not.toHaveBeenCalled();
        expect(router.url).toBe('/exercises');
    });

    it('cross-fades with reduced motion, rather than sliding', async () => {
        fakeReducedMotion(true);
        const start = vi.spyOn(document, 'startViewTransition');

        slide.follow(click(), '/exercises/back-squat', 'in');

        expect(start).toHaveBeenCalledTimes(1);
        expect(root.classList).toContain(FADING_CLASS);
        expect(root.classList).not.toContain(SLIDING_CLASS);
        await landed('/exercises/back-squat');
        await start.mock.results[0].value.finished;
        expect(root.classList).not.toContain(FADING_CLASS);
    });
});
