import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, input } from '@angular/core';

@Component({
    selector: 'app-infinity-button',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './infinity-button.component.html',
    styleUrl: './infinity-button.component.scss'
})
export class InfinityButtonComponent {
    readonly text = input<string>('Button');
    readonly disabled = input<boolean>(false);
    readonly type = input<'button' | 'submit' | 'reset'>('button');
    readonly size = input<'small' | 'medium' | 'large'>('medium');
    readonly variant = input<'primary' | 'secondary'>('primary');
    
    @Output() buttonClick = new EventEmitter<void>();

    onClick() {
        if (!this.disabled()) {
        this.buttonClick.emit();
        }
    }

    get buttonClasses(): string {
        const sizeClasses = {
        small: 'infinity-button--small',
        medium: 'infinity-button--medium', 
        large: 'infinity-button--large'
        };
        
        const variantClasses = {
        primary: 'infinity-button--primary',
        secondary: 'infinity-button--secondary'
        };

        return `infinity-button ${sizeClasses[this.size()]} ${variantClasses[this.variant()]} ${this.disabled() ? 'infinity-button--disabled' : ''}`.trim();
    }
}