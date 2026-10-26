import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { fakeReducedMotion } from '../shared/testing/fake-reduced-motion';
import { PageSlide } from './page-slide';
import { SwipeBackDirective } from './swipe-back.directive';

@Component({
    imports: [SwipeBackDirective],
    template: `
        <div
            class="page"
            style="width: 400px; height: 300px"
            appSwipeBack="/exercises?muscles=quads"
            [swipeBackDisabled]="disabled()"
        >
            <button type="button" (click)="pressed.set(true)">Edit</button>
            <input aria-label="Search" />
        </div>
    `,
})
class SwipePage {
    readonly disabled = signal(false);
    readonly pressed = signal(false);
}

describe('SwipeBackDirective', () => {
    let fixture: ComponentFixture<SwipePage>;
    let page: HTMLElement;
    const navigate = vi.fn();

    beforeEach(async () => {
        navigate.mockReset();
        fakeReducedMotion(false);
        // Pointers made up by a test aren't active, so the browser won't capture them
        vi.spyOn(Element.prototype, 'setPointerCapture').mockImplementation(() => undefined);
        TestBed.configureTestingModule({
            providers: [{ provide: PageSlide, useValue: { navigate } }],
        });
        fixture = TestBed.createComponent(SwipePage);
        await fixture.whenStable();
        page = fixture.nativeElement.querySelector('.page');
    });

    const pointer = (
        type: string,
        x: number,
        y = 100,
        { target = page, pointerType = 'touch' }: { target?: Element; pointerType?: string } = {}
    ) =>
        target.dispatchEvent(
            new PointerEvent(type, {
                bubbles: true,
                pointerId: 7,
                isPrimary: true,
                pointerType,
                clientX: x,
                clientY: y,
            })
        );

    /** Long enough that letting go after it reads as still, not as a flick. */
    const pause = () => new Promise((resolve) => setTimeout(resolve, 150));
    /** A moment between moves, so they have a speed. */
    const tick = () => new Promise((resolve) => setTimeout(resolve, 20));

    it('follows a finger moving right, and goes back once let go past halfway', async () => {
        pointer('pointerdown', 20);
        pointer('pointermove', 120);
        pointer('pointermove', 270);

        expect(page.style.transform).toBe('translateX(250px)');
        await pause();
        pointer('pointerup', 270);

        expect(navigate).toHaveBeenCalledWith('/exercises?muscles=quads', 'out', 0);
    });

    it('springs back into place when let go short of halfway, without a flick', async () => {
        pointer('pointerdown', 20);
        pointer('pointermove', 60);
        pointer('pointermove', 100);
        await pause();
        pointer('pointerup', 100);

        expect(navigate).not.toHaveBeenCalled();
        expect(page.style.transform).toBe('');
        expect(page.getAnimations()).toHaveLength(1);
    });

    it('goes back on a quick flick, handing its speed on', async () => {
        pointer('pointerdown', 20);
        await tick();
        pointer('pointermove', 50);
        await tick();
        pointer('pointermove', 90);
        pointer('pointerup', 90);

        expect(navigate).toHaveBeenCalledTimes(1);
        expect(navigate.mock.calls[0][2]).toBeGreaterThan(0);
    });

    it("doesn't follow the finger back past where it started", () => {
        pointer('pointerdown', 100);
        pointer('pointermove', 130);
        pointer('pointermove', 40, 110);

        expect(page.style.transform).toBe('translateX(0px)');
    });

    it('leaves an up-and-down move to the page, as a scroll', () => {
        pointer('pointerdown', 20, 100);
        pointer('pointermove', 30, 160);
        pointer('pointermove', 200, 170);
        pointer('pointerup', 200, 170);

        expect(page.style.transform).toBe('');
        expect(navigate).not.toHaveBeenCalled();
    });

    it("doesn't press the button a swipe starts on", () => {
        const button = page.querySelector('button')!;
        pointer('pointerdown', 20, 100, { target: button });
        pointer('pointermove', 80);
        pointer('pointermove', 300);
        pointer('pointerup', 300);
        button.click();

        expect(fixture.componentInstance.pressed()).toBe(false);
    });

    it('leaves a mouse drag, a drag in a text box, and a page with a dialog open alone', () => {
        pointer('pointerdown', 20, 100, { pointerType: 'mouse' });
        pointer('pointermove', 300, 100, { pointerType: 'mouse' });
        pointer('pointerup', 300, 100, { pointerType: 'mouse' });

        pointer('pointerdown', 20, 100, { target: page.querySelector('input')! });
        pointer('pointermove', 300);
        pointer('pointerup', 300);

        fixture.componentInstance.disabled.set(true);
        fixture.detectChanges();
        pointer('pointerdown', 20);
        pointer('pointermove', 300);
        pointer('pointerup', 300);

        expect(page.style.transform).toBe('');
        expect(navigate).not.toHaveBeenCalled();
    });
});
