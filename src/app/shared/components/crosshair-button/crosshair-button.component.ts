import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, input } from '@angular/core';

@Component({
  selector: 'app-crosshair-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './crosshair-button.component.html',
  styleUrl: './crosshair-button.component.scss'
})
export class CrosshairButtonComponent {
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
      small: 'crosshair-button--small',
      medium: 'crosshair-button--medium', 
      large: 'crosshair-button--large'
    };
    
    const variantClasses = {
      primary: 'crosshair-button--primary',
      secondary: 'crosshair-button--secondary'
    };

    return `crosshair-button ${sizeClasses[this.size()]} ${variantClasses[this.variant()]} ${this.disabled() ? 'crosshair-button--disabled' : ''}`.trim();
  }
}