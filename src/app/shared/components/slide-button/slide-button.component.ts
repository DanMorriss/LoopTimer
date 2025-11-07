import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, input } from '@angular/core';

@Component({
  selector: 'app-slide-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './slide-button.component.html',
  styleUrl: './slide-button.component.scss'
})
export class SlideButtonComponent {
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
      small: 'slide-button--small',
      medium: 'slide-button--medium', 
      large: 'slide-button--large'
    };
    
    const variantClasses = {
      primary: 'slide-button--primary',
      secondary: 'slide-button--secondary'
    };

    return `slide-button ${sizeClasses[this.size()]} ${variantClasses[this.variant()]} ${this.disabled() ? 'slide-button--disabled' : ''}`.trim();
  }
}