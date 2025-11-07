import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, input } from '@angular/core';

@Component({
  selector: 'app-edge-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './edge-button.component.html',
  styleUrl: './edge-button.component.scss'
})
export class EdgeButtonComponent {
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
      small: 'edge-button--small',
      medium: 'edge-button--medium', 
      large: 'edge-button--large'
    };
    
    const variantClasses = {
      primary: 'edge-button--primary',
      secondary: 'edge-button--secondary'
    };

    return `edge-button ${sizeClasses[this.size()]} ${variantClasses[this.variant()]} ${this.disabled() ? 'edge-button--disabled' : ''}`.trim();
  }
}