import { Component, computed, input, output } from '@angular/core';
import { injectPrefersReducedMotion } from '../../reduced-motion';

const SIZE_CLASSES = {
    small: 'infinity-button--small',
    medium: 'infinity-button--medium',
    large: 'infinity-button--large',
};

const VARIANT_CLASSES = {
    primary: 'infinity-button--primary',
    secondary: 'infinity-button--secondary',
};

@Component({
    selector: 'app-infinity-button',
    templateUrl: './infinity-button.component.html',
    styleUrl: './infinity-button.component.scss',
})
export class InfinityButtonComponent {
    readonly text = input<string>('Button');
    readonly disabled = input<boolean>(false);
    readonly type = input<'button' | 'submit' | 'reset'>('button');
    readonly size = input<'small' | 'medium' | 'large'>('medium');
    readonly variant = input<'primary' | 'secondary'>('primary');
    /** Keyboard shortcut for this button, e.g. 'Space', announced by screen readers. */
    readonly keyShortcuts = input<string | null>(null);

    readonly buttonClick = output<void>();

    protected readonly reducedMotion = injectPrefersReducedMotion();

    readonly buttonClasses = computed(() =>
        `infinity-button ${SIZE_CLASSES[this.size()]} ${VARIANT_CLASSES[this.variant()]} ${this.disabled() ? 'infinity-button--disabled' : ''}`.trim()
    );

    onClick() {
        if (!this.disabled()) {
            this.buttonClick.emit();
        }
    }
}
