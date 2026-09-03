import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InfinityButtonComponent } from './infinity-button.component';

describe('CrosshairButtonComponent', () => {
    let component: InfinityButtonComponent;
    let fixture: ComponentFixture<InfinityButtonComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
        imports: [InfinityButtonComponent]
        })
        .compileComponents();

        fixture = TestBed.createComponent(InfinityButtonComponent);
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
        
        const expectedClasses = 'infinity-button infinity-button--large infinity-button--secondary infinity-button--disabled';
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
});