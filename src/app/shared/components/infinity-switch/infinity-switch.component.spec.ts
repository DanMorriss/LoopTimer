import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { contrastRatio } from '../../testing/contrast';
import { fakeReducedMotion } from '../../testing/fake-reduced-motion';
import { InfinitySwitchComponent } from './infinity-switch.component';

@Component({
    imports: [InfinitySwitchComponent],
    template: `
        <span id="switch-label">Until stopped</span>
        <app-infinity-switch [(checked)]="on" labelledBy="switch-label" />
    `,
    // The switch's colours are checked against the dark page it sits on
    styles: ':host { display: block; background: #0f172a; }',
})
class HostComponent {
    on = signal(false);
}

describe('InfinitySwitchComponent', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;

    beforeEach(() => {
        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
        fixture.detectChanges();
    });
    afterEach(() => fixture.destroy());

    const button = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    const dot = () => fixture.nativeElement.querySelector('.infinity-switch__dot') as HTMLElement;

    function click() {
        button().click();
        fixture.detectChanges();
    }

    it('is a labelled switch button', () => {
        expect(button().getAttribute('role')).toBe('switch');
        expect(button().type).toBe('button');
        expect(button().getAttribute('aria-labelledby')).toBe('switch-label');
    });

    it('turns on and off when clicked, updating what it is bound to', () => {
        expect(button().getAttribute('aria-checked')).toBe('false');

        click();
        expect(host.on()).toBe(true);
        expect(button().getAttribute('aria-checked')).toBe('true');

        click();
        expect(host.on()).toBe(false);
        expect(button().getAttribute('aria-checked')).toBe('false');
    });

    it('follows changes from outside', () => {
        host.on.set(true);
        fixture.detectChanges();

        expect(button().getAttribute('aria-checked')).toBe('true');
    });

    it('says On or Off, so the state does not rely on colour or motion', () => {
        expect(button().textContent).toContain('Off');

        click();

        expect(button().textContent).toContain('On');
    });

    describe('the dot', () => {
        const racing = () => getComputedStyle(dot()).animationName !== 'none';
        const loopColour = () =>
            getComputedStyle(fixture.nativeElement.querySelector('.infinity-switch__track path'))
                .stroke;
        /** The dot gets back to the left end of the loop. */
        function lapEnds() {
            dot().dispatchEvent(new AnimationEvent('animationiteration'));
            fixture.detectChanges();
        }

        it('rests at the start of the loop when off, and races round when on', () => {
            expect(racing()).toBe(false);

            click();

            expect(racing()).toBe(true);
        });

        it('greys out at once when turned off, but finishes its lap before stopping', () => {
            click();
            const offColour = 'rgb(148, 163, 184)';
            expect(loopColour()).not.toBe(offColour);

            click();
            expect(loopColour()).toBe(offColour);
            expect(racing()).toBe(true);

            lapEnds();
            expect(racing()).toBe(false);
        });

        it('keeps racing if turned back on before the lap ends', () => {
            click();
            click();

            click();
            lapEnds();

            expect(racing()).toBe(true);
        });

        it('starts racing if the switch starts on, e.g. editing a timer that runs until stopped', () => {
            fixture.destroy();
            fixture = TestBed.createComponent(HostComponent);
            fixture.componentInstance.on.set(true);
            fixture.detectChanges();

            expect(racing()).toBe(true);
        });
    });

    describe('with reduced motion', () => {
        beforeEach(() => {
            fakeReducedMotion(true);
            fixture.destroy();
            fixture = TestBed.createComponent(HostComponent);
            host = fixture.componentInstance;
            fixture.detectChanges();
        });

        it('stops the dot at once when turned off, as there is no lap to finish', () => {
            click();

            click();

            expect(button().classList).not.toContain('infinity-switch--racing');
        });
    });

    it('makes the loop stand out from its box, on or off (at least 3:1)', () => {
        const box = getComputedStyle(fixture.nativeElement as HTMLElement).backgroundColor;
        const loop = () =>
            getComputedStyle(fixture.nativeElement.querySelector('.infinity-switch__track path'))
                .stroke;

        expect(contrastRatio(loop(), box)).toBeGreaterThanOrEqual(3);
        click();
        expect(contrastRatio(loop(), box)).toBeGreaterThanOrEqual(3);
    });
});
