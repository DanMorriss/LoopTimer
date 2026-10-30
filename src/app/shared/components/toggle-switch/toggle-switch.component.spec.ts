import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToggleSwitchComponent } from './toggle-switch.component';

@Component({
    imports: [ToggleSwitchComponent],
    template: `
        <span id="label">Sound</span>
        <span id="hint">Beeps as each phase starts</span>
        <app-toggle-switch
            [(checked)]="on"
            [disabled]="disabled()"
            labelledBy="label"
            describedBy="hint"
        />
    `,
})
class HostComponent {
    on = signal(false);
    disabled = signal(false);
}

describe('ToggleSwitchComponent', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;

    beforeEach(() => {
        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
        fixture.detectChanges();
    });
    afterEach(() => fixture.destroy());

    const button = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    function click() {
        button().click();
        fixture.detectChanges();
    }

    it('is a labelled, described switch button', () => {
        expect(button().getAttribute('role')).toBe('switch');
        expect(button().type).toBe('button');
        expect(button().getAttribute('aria-labelledby')).toBe('label');
        expect(button().getAttribute('aria-describedby')).toBe('hint');
    });

    it('turns on and off when clicked, saying On or Off', () => {
        expect(button().getAttribute('aria-checked')).toBe('false');
        expect(button().textContent).toContain('Off');

        click();
        expect(host.on()).toBe(true);
        expect(button().getAttribute('aria-checked')).toBe('true');
        expect(button().textContent).toContain('On');

        click();
        expect(host.on()).toBe(false);
    });

    describe('dragged', () => {
        const knob = () =>
            fixture.nativeElement.querySelector('.toggle-switch__knob') as HTMLElement;
        const pointer = (type: string, x: number) =>
            button().dispatchEvent(
                new PointerEvent(type, {
                    bubbles: true,
                    pointerId: 3,
                    isPrimary: true,
                    pointerType: 'touch',
                    clientX: x,
                    clientY: 10,
                })
            );
        const knobX = () => new DOMMatrix(getComputedStyle(knob()).transform).m41;
        /** Long enough that letting go after it reads as still, not as a flick. */
        const pause = () => new Promise((resolve) => setTimeout(resolve, 150));

        beforeEach(() => {
            // Pointers made up by a test aren't active, so the browser won't capture them
            vi.spyOn(Element.prototype, 'setPointerCapture').mockImplementation(() => undefined);
        });

        it('springs on from where it was let go, rather than from its last place', async () => {
            pointer('pointerdown', 10);
            pointer('pointermove', 30);
            pointer('pointermove', 28);
            await pause();
            pointer('pointerup', 28);
            fixture.detectChanges();
            await fixture.whenStable();

            expect(host.on()).toBe(true);
            const [spring] = knob()
                .getAnimations()
                .filter((a) => !(a instanceof CSSTransition));
            const [from] = (spring.effect as KeyframeEffect).getKeyframes();
            // e.g. "translate(18px, -50%)": across, and centred upright
            const across = Number(/translate\(([\d.]+)px/.exec(from['transform'] as string)![1]);
            expect(across).toBeGreaterThan(10);
        });

        it('stops where it is when caught on that spring', async () => {
            pointer('pointerdown', 10);
            pointer('pointermove', 30);
            pointer('pointermove', 22);
            await pause();
            pointer('pointerup', 22);
            fixture.detectChanges();
            await fixture.whenStable();
            await new Promise((resolve) => setTimeout(resolve, 40));
            const seen = knobX();

            pointer('pointerdown', 50);

            expect(knobX()).toBeCloseTo(seen, 0);
            expect(
                knob()
                    .getAnimations()
                    .filter((a) => !(a instanceof CSSTransition))
            ).toEqual([]);
        });
    });

    it('can be disabled', () => {
        host.disabled.set(true);
        fixture.detectChanges();

        click();

        expect(button().disabled).toBe(true);
        expect(host.on()).toBe(false);
    });
});
