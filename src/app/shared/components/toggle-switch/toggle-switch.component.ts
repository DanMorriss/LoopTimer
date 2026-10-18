import { Component, input, model } from '@angular/core';

/** An on/off switch in the app's style. It says On or Off, so the state never relies on colour. */
@Component({
    selector: 'app-toggle-switch',
    template: `
        <button
            type="button"
            role="switch"
            class="toggle-switch"
            [class.toggle-switch--on]="checked()"
            [attr.aria-checked]="checked()"
            [attr.aria-labelledby]="labelledBy()"
            [attr.aria-describedby]="describedBy()"
            [disabled]="disabled()"
            (click)="checked.set(!checked())"
        >
            <span class="toggle-switch__track" aria-hidden="true">
                <span class="toggle-switch__knob"></span>
            </span>
            <span class="toggle-switch__state" aria-hidden="true">{{
                checked() ? 'On' : 'Off'
            }}</span>
        </button>
    `,
    styleUrl: './toggle-switch.component.scss',
})
export class ToggleSwitchComponent {
    readonly checked = model(false);
    /** id of the element that labels this switch. */
    readonly labelledBy = input<string>();
    /** id of an element with more detail, read after the label. */
    readonly describedBy = input<string>();
    readonly disabled = input(false);
}
