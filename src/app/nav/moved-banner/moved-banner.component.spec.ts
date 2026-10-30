import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AddressMove, MoveState } from './address-move.service';
import { MovedBannerComponent } from './moved-banner.component';

describe('MovedBannerComponent', () => {
    let state: ReturnType<typeof signal<MoveState>>;
    let check: () => Promise<void>;

    function render(homeScreenApp = false): HTMLElement {
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                { provide: AddressMove, useValue: { state, homeScreenApp, check: () => check() } },
            ],
        });
        const fixture = TestBed.createComponent(MovedBannerComponent);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    function buttons(element: HTMLElement): string[] {
        return [...element.querySelectorAll('a, button')].map((b) => b.textContent!.trim());
    }

    beforeEach(() => {
        state = signal<MoveState>('checking');
        check = vi.fn(async () => undefined);
    });

    it('shows nothing while checking, or moving', () => {
        expect(render().querySelector('section')).toBeNull();
        TestBed.resetTestingModule();
        state.set('moving');
        expect(render().querySelector('section')).toBeNull();
    });

    it('asks a guest to sign in, to take their workouts', () => {
        state.set('guest');
        const element = render();

        expect(element.querySelector('h2')!.textContent).toContain(
            'Loop Workouts has moved to loopworkouts.com'
        );
        expect(element.textContent).toContain('Sign in to take them with you');
        expect(buttons(element)).toEqual(['Sign in', 'Open loopworkouts.com']);
        expect(element.querySelector('a[href="https://loopworkouts.com"]')).not.toBeNull();
        expect(element.querySelector('a[href="/account"]')).not.toBeNull();
    });

    it("tries syncing again when changes haven't synced", () => {
        state.set('unsynced');
        const element = render();

        element.querySelector<HTMLButtonElement>('button')!.click();

        expect(check).toHaveBeenCalledOnce();
    });

    it('tells a Home Screen app to add the new address', () => {
        state.set('ready');
        const element = render(true);

        expect(element.textContent).toContain('add it to your Home Screen');
        expect(buttons(element)).toEqual(['Open loopworkouts.com']);
    });
});
