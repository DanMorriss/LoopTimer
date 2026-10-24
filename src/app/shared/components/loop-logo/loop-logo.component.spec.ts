import { TestBed } from '@angular/core/testing';

import { LoopLogoComponent } from './loop-logo.component';
import { fakeReducedMotion } from '../../testing/fake-reduced-motion';

describe('LoopLogoComponent', () => {
    function render(reduced: boolean) {
        const motion = fakeReducedMotion(reduced);
        const logo = TestBed.createComponent(LoopLogoComponent);
        logo.detectChanges();
        return {
            logo,
            motion,
            dot: () => logo.nativeElement.querySelector('.light-dot').parentElement as SVGGElement,
        };
    }

    it('is hidden from screen readers, as decoration', () => {
        const { logo } = render(false);

        expect(logo.nativeElement.getAttribute('aria-hidden')).toBe('true');
    });

    it('moves the dot round the logo normally', () => {
        const { logo, dot } = render(false);

        expect(logo.nativeElement.querySelector('animateMotion')).not.toBeNull();
        expect(dot().getAttribute('transform')).toBeNull();
    });

    describe('with reduced motion', () => {
        it('rests the dot where the loops cross instead', () => {
            const { logo, dot } = render(true);

            expect(logo.nativeElement.querySelector('animateMotion')).toBeNull();
            expect(dot().getAttribute('transform')).toBe('translate(100 50)');
        });

        it('stops the dot if the setting is turned on while it shows', () => {
            const { logo, motion } = render(false);

            motion.set(true);
            logo.detectChanges();

            expect(logo.nativeElement.querySelector('animateMotion')).toBeNull();
        });
    });
});
