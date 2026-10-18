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

    it('can be disabled', () => {
        host.disabled.set(true);
        fixture.detectChanges();

        click();

        expect(button().disabled).toBe(true);
        expect(host.on()).toBe(false);
    });
});
