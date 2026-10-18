import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { contrastRatio } from '../../testing/contrast';
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

    it('rests the dot at the start of the loop when off, and sends it round when on', () => {
        expect(getComputedStyle(dot()).animationName).toBe('none');

        click();

        expect(getComputedStyle(dot()).animationName).not.toBe('none');
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
