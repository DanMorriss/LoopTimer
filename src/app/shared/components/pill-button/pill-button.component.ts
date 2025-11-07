import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, input } from '@angular/core';

@Component({
  selector: 'app-pill-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pill-button.component.html',
  styleUrl: './pill-button.component.scss'
})
export class PillButtonComponent {
  readonly text = input<string>('Read More');
  readonly disabled = input<boolean>(false);
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly size = input<'small' | 'medium' | 'large'>('medium');
  readonly variant = input<'primary' | 'secondary' | 'success'>('primary');
  
  @Output() buttonClick = new EventEmitter<void>();

  onClick() {
    if (!this.disabled()) {
      this.buttonClick.emit();
    }
  }

  get buttonClasses(): string {
    const sizeClasses = {
      small: 'pill-button--small',
      medium: 'pill-button--medium', 
      large: 'pill-button--large'
    };
    
    const variantClasses = {
      primary: 'pill-button--primary',
      secondary: 'pill-button--secondary',
      success: 'pill-button--success'
    };

    return `pill-button ${sizeClasses[this.size()]} ${variantClasses[this.variant()]} ${this.disabled() ? 'pill-button--disabled' : ''}`.trim();
  }
}