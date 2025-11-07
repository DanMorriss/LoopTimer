import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrosshairButtonComponent } from './crosshair-button.component';

describe('CrosshairButtonComponent', () => {
  let component: CrosshairButtonComponent;
  let fixture: ComponentFixture<CrosshairButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrosshairButtonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrosshairButtonComponent);
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
    expect(component.text()).toBe('Button');
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
    
    const expectedClasses = 'crosshair-button crosshair-button--large crosshair-button--secondary crosshair-button--disabled';
    expect(component.buttonClasses).toBe(expectedClasses);
  });

  it('should update input values when changed', () => {
    fixture.componentRef.setInput('text', 'Target Acquired');
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    
    expect(component.text()).toBe('Target Acquired');
    expect(component.disabled()).toBe(true);
  });

  it('should render text correctly', () => {
    fixture.componentRef.setInput('text', 'Fire');
    fixture.detectChanges();
    
    const buttonElement = fixture.nativeElement.querySelector('button');
    expect(buttonElement.textContent.trim()).toContain('Fire');
  });

  it('should have four crosshair lines', () => {
    const lines = fixture.nativeElement.querySelectorAll('.crosshair-button__line');
    expect(lines.length).toBe(4);
    
    const classes = Array.from(lines as NodeListOf<Element>).map((line: Element) => line.className);
    expect(classes).toContain('crosshair-button__line crosshair-button__line--left');
    expect(classes).toContain('crosshair-button__line crosshair-button__line--top');
    expect(classes).toContain('crosshair-button__line crosshair-button__line--right');
    expect(classes).toContain('crosshair-button__line crosshair-button__line--bottom');
  });
});