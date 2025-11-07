import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SlideButtonComponent } from './slide-button.component';

describe('SlideButtonComponent', () => {
  let component: SlideButtonComponent;
  let fixture: ComponentFixture<SlideButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SlideButtonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SlideButtonComponent);
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
    
    const expectedClasses = 'slide-button slide-button--large slide-button--secondary slide-button--disabled';
    expect(component.buttonClasses).toBe(expectedClasses);
  });

  it('should update input values when changed', () => {
    fixture.componentRef.setInput('text', 'Custom Text');
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    
    expect(component.text()).toBe('Custom Text');
    expect(component.disabled()).toBe(true);
  });
});