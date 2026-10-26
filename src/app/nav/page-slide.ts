import { ApplicationRef, inject, Service } from '@angular/core';
import { Router } from '@angular/router';
import { spring } from '../shared/spring';

/** On <html> while a page slides, naming the parts that move. */
export const SLIDING_CLASS = 'page-sliding';

/** Into a page further in (`in`, e.g. an exercise from the list), or back out of it (`out`). */
export type SlideWay = 'in' | 'out';

/**
 * Going into an exercise from the Exercises list and back (or Privacy or Terms from Settings)
 * slides the page across, as a phone does: the new page comes in from the right over the list,
 * which moves a little way left and fades; going back, the page leaves to the right and the
 * list comes back. Every other navigation changes page at once, so this starts its own view
 * transition around those,
 * as WorkoutMorph does for the workout. The names it moves (styles/_page-slide.scss) only
 * apply under SLIDING_CLASS.
 */
@Service()
export class PageSlide {
    private readonly router = inject(Router);
    private readonly appRef = inject(ApplicationRef);
    /** How far down the list was scrolled when an exercise was opened from it. */
    private listScroll = 0;

    /**
     * For a link's (click): goes to `url`, sliding `way`. A click that opens a new tab or
     * window instead (a modifier key, or a middle click) is left to the browser and the link's
     * href.
     */
    follow(event: MouseEvent, url: string, way: SlideWay) {
        if (
            event.button !== 0 ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            event.altKey
        ) {
            return;
        }
        event.preventDefault();
        this.navigate(url, way);
    }

    /**
     * Goes to `url`, sliding `way`. With reduced motion, or a browser without view
     * transitions, it just goes. After a swipe back, `velocity` (px/s to the right) hands the
     * finger's speed on, so the page carries on at the speed it was let go. It carries on from
     * where the finger left it too, as the old picture is taken with the page still moved
     * along (SwipeBackDirective).
     *
     * The page going in opens at its top, and the list comes back scrolled where it was left.
     */
    navigate(url: string, way: SlideWay, velocity?: number) {
        const top = way === 'in' ? 0 : this.listScroll;
        this.listScroll = way === 'in' ? window.scrollY : 0;
        const go = async () => {
            await this.router.navigateByUrl(url);
            // Render now, so the new page is what's scrolled (and what the browser slides in)
            this.appRef.tick();
            window.scrollTo({ top, behavior: 'instant' });
        };
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduced || !document.startViewTransition) {
            void go();
            return;
        }
        const root = document.documentElement;
        const classes = [SLIDING_CLASS, `${SLIDING_CLASS}--${way}`];
        root.classList.add(...classes);
        if (velocity !== undefined) {
            // A spring already moving at the finger's speed, as a fraction of the way across
            // (the page's width) per second
            const timing = spring(0.3, {
                velocity: Math.max(0, velocity) / Math.max(1, root.clientWidth),
            });
            root.style.setProperty('--slide-easing', timing.easing);
            root.style.setProperty('--slide-duration', `${timing.duration}ms`);
        }
        const transition = document.startViewTransition(go);
        // Interrupted (e.g. another view transition starting) rejects `ready`; nothing waits on it
        transition.ready.catch(() => undefined);
        transition.finished.finally(() => {
            root.classList.remove(...classes);
            root.style.removeProperty('--slide-easing');
            root.style.removeProperty('--slide-duration');
        });
    }
}
