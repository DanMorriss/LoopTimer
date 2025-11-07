import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PillButtonComponent } from './pill-button.component';

describe('PillButtonComponent', () => {
  let component: PillButtonComponent;
  let fixture: ComponentFixture<PillButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PillButtonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PillButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit buttonClick when clicked', () => {
    spyOn(component.buttonClick, 'emit');
    
    component.onClick();
    
    expect(component.buttonClick.emit).toHaveBeenCalled();
  });

  it('should not emit buttonClick when disabled', () => {
    spyOn(component.buttonClick, 'emit');
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    
    component.onClick();
    
    expect(component.buttonClick.emit).not.toHaveBeenCalled();
  });

  it('should have default input values', () => {
    expect(component.text()).toBe('Read More');
    expect(component.disabled()).toBe(false);
    expect(component.type()).toBe('button');
    expect(component.size()).toBe('medium');
    expect(component.variant()).toBe('primary');
  });

  it('should apply correct CSS classes based on inputs', () => {
    fixture.componentRef.setInput('size', 'large');
    fixture.componentRef.setInput('variant', 'secondary');
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    
    const expectedClasses = 'pill-button pill-button--large pill-button--secondary pill-button--disabled';
    expect(component.buttonClasses).toBe(expectedClasses);
  });

  it('should update input values when changed', () => {
    fixture.componentRef.setInput('text', 'Learn More');
    fixture.componentRef.setInput('variant', 'success');
    fixture.detectChanges();
    
    expect(component.text()).toBe('Learn More');
    expect(component.variant()).toBe('success');
  });

  it('should render text correctly', () => {
    fixture.componentRef.setInput('text', 'Click Me');
    fixture.detectChanges();
    
    const buttonElement = fixture.nativeElement.querySelector('.pill-button__inner');
    expect(buttonElement.textContent.trim()).toBe('Click Me');
  });

  it('should have glassmorphism container and inner button', () => {
    const container = fixture.nativeElement.querySelector('.pill-button');
    const innerButton = fixture.nativeElement.querySelector('.pill-button__inner');
    
    expect(container).toBeTruthy();
    expect(innerButton).toBeTruthy();
  });

  it('should support all three variants', () => {
    // Test primary
    fixture.componentRef.setInput('variant', 'primary');
    fixture.detectChanges();
    expect(component.buttonClasses).toContain('pill-button--primary');
    
    // Test secondary
    fixture.componentRef.setInput('variant', 'secondary');
    fixture.detectChanges();
    expect(component.buttonClasses).toContain('pill-button--secondary');
    
    // Test success
    fixture.componentRef.setInput('variant', 'success');
    fixture.detectChanges();
    expect(component.buttonClasses).toContain('pill-button--success');
  });
});