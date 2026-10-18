import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { NavComponent } from './nav.component';

describe('NavComponent', () => {
    let component: NavComponent;
    let fixture: ComponentFixture<NavComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [NavComponent],
            providers: [provideRouter([])],
        }).compileComponents();

        fixture = TestBed.createComponent(NavComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('goes home from the home button', () => {
        const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

        fixture.nativeElement.querySelector('button[aria-label="Go to Home"]').click();

        expect(navigate).toHaveBeenCalledWith(['/home']);
    });

    it('links to the history from the clock button', () => {
        const link: HTMLAnchorElement =
            fixture.nativeElement.querySelector('a[aria-label="History"]');

        expect(link.getAttribute('href')).toBe('/history');
    });

    it('links to settings from the gear button', () => {
        const link: HTMLAnchorElement = fixture.nativeElement.querySelector(
            'a[aria-label="Settings"]'
        );

        expect(link.getAttribute('href')).toBe('/settings');
    });
});
