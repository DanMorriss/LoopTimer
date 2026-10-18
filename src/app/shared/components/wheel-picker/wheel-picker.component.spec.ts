import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { userEvent } from 'vitest/browser';
import { fakeReducedMotion } from '../../testing/fake-reduced-motion';
import { WheelPickerComponent, WheelPickerOption } from './wheel-picker.component';

const OPTIONS: WheelPickerOption[] = Array.from({ length: 21 }, (_, i) => ({
    value: i,
    label: i.toString().padStart(2, '0'),
}));

@Component({
    imports: [WheelPickerComponent],
    template: `
        <span id="picker-label">Seconds</span>
        <app-wheel-picker [(value)]="value" [options]="options()" labelledBy="picker-label" />
    `,
})
class HostComponent {
    value = signal(3);
    options = signal(OPTIONS);
}

describe('WheelPickerComponent', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;

    async function create(reducedMotion = false) {
        fakeReducedMotion(reducedMotion);
        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
        await settle();
    }

    async function settle() {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    const viewport = () =>
        fixture.nativeElement.querySelector('[role="spinbutton"]') as HTMLElement;
    const item = (value: number) =>
        fixture.nativeElement.querySelector(`[data-value="${value}"]`) as HTMLElement;
    const rowHeight = () => item(0).offsetHeight;
    /** Which value sits in the middle of the wheel. */
    const valueInMiddle = () => Math.round(viewport().scrollTop / rowHeight());

    /** Wait for a smooth scroll to finish. */
    async function scrolled() {
        await new Promise((resolve) => setTimeout(resolve, 600));
        await settle();
    }

    function press(key: string) {
        viewport().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    }

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const isOpen = () =>
        fixture.nativeElement
            .querySelector('app-wheel-picker')
            .classList.contains('wheel-picker--open');

    /** A pointer pressing (or letting go of) the wheel. */
    function pointer(type: 'pointerdown' | 'pointerup' | 'pointercancel', pointerType = 'mouse') {
        viewport().dispatchEvent(
            new PointerEvent(type, { pointerType, pointerId: 1, button: 0, bubbles: true })
        );
        fixture.detectChanges();
    }

    /**
     * Press and let go, as the start of a tap or click. Not followed by settle(): whenStable
     * waits for every timer, so it would sit out the second until the wheel closes again.
     */
    async function openByPress() {
        pointer('pointerdown');
        pointer('pointerup');
        await wait(50);
        fixture.detectChanges();
    }

    afterEach(() => fixture?.destroy());

    describe('for screen readers', () => {
        it('is a labelled spin button reporting its value and range', async () => {
            await create();
            const spin = viewport();

            expect(spin.getAttribute('aria-labelledby')).toBe('picker-label');
            expect(spin.getAttribute('aria-valuenow')).toBe('3');
            expect(spin.getAttribute('aria-valuetext')).toBe('03');
            expect(spin.getAttribute('aria-valuemin')).toBe('0');
            expect(spin.getAttribute('aria-valuemax')).toBe('20');
            expect(spin.tabIndex).toBe(0);
        });

        it("says an option's spoken label, and reports the true range when the order differs", async () => {
            await create();
            // 1-20, then ∞ (stored as 0) at the end
            host.options.set([
                ...OPTIONS.slice(1),
                { value: 0, label: '∞', spokenLabel: 'until stopped' },
            ]);
            host.value.set(0);
            await settle();

            expect(viewport().getAttribute('aria-valuetext')).toBe('until stopped');
            expect(viewport().getAttribute('aria-valuemin')).toBe('0');
            expect(viewport().getAttribute('aria-valuemax')).toBe('20');
        });

        it('hides the individual numbers, which are only visual', async () => {
            await create();

            expect(item(5).getAttribute('aria-hidden')).toBe('true');
        });
    });

    describe('showing the value', () => {
        it('shows only the selected number while closed', async () => {
            await create();

            expect(isOpen()).toBe(false);
            expect(viewport().clientHeight).toBe(rowHeight());
            expect(valueInMiddle()).toBe(3);
        });

        it('starts with the current value in the middle', async () => {
            await create();

            expect(valueInMiddle()).toBe(3);
            expect(item(3).classList).toContain('wheel-picker__item--selected');
        });

        it('glides to a value set from outside, such as the ∞ switch', async () => {
            await create();

            host.value.set(12);
            await settle();
            await scrolled();

            expect(valueInMiddle()).toBe(12);
        });
    });

    describe('choosing a value', () => {
        it('selects whatever settles in the middle after scrolling', async () => {
            await create();

            viewport().scrollTop = 7 * rowHeight();
            viewport().dispatchEvent(new Event('scrollend'));
            await settle();

            expect(host.value()).toBe(7);
        });

        it('selects a number when it is clicked', async () => {
            await create();

            item(5).click();
            await scrolled();

            expect(host.value()).toBe(5);
            expect(valueInMiddle()).toBe(5);
        });

        it('turns with a mouse drag and snaps to a whole row', async () => {
            await create();
            await openByPress();

            // Drag the bottom visible number (4) up to the top row (2): two rows
            await userEvent.dragAndDrop(item(4), item(2));
            await scrolled();

            expect(host.value()).toBe(5);
            expect(viewport().scrollTop % rowHeight()).toBe(0);
        });

        it('leaves touch scrolling to the browser', async () => {
            await create();
            const before = viewport().scrollTop;

            for (const [type, y] of [
                ['pointerdown', 100],
                ['pointermove', 20],
                ['pointerup', 20],
            ] as const) {
                viewport().dispatchEvent(
                    new PointerEvent(type, {
                        pointerType: 'touch',
                        pointerId: 9,
                        clientY: y,
                        bubbles: true,
                    })
                );
            }

            expect(viewport().scrollTop).toBe(before);
            expect(host.value()).toBe(3);
        });
    });

    describe('opening and closing', () => {
        it('opens on press, with two numbers either side and the selected one kept in place', async () => {
            await create();

            pointer('pointerdown', 'touch');
            await wait(250);
            await settle();

            expect(isOpen()).toBe(true);
            expect(viewport().clientHeight).toBe(5 * rowHeight());
            expect(valueInMiddle()).toBe(3);
        });

        it('stays open while pressed, then (not turned) closes a second after it is let go', async () => {
            await create();

            pointer('pointerdown');
            await wait(1200);
            expect(isOpen()).toBe(true);

            pointer('pointerup');
            await wait(500);
            expect(isOpen()).toBe(true);
            await wait(700);
            await settle();
            expect(isOpen()).toBe(false);
        });

        it('stays open while a finger scrolls it, until the finger lifts', async () => {
            await create();

            // Native scrolling cancels the pointer, though the finger is still down
            pointer('pointerdown', 'touch');
            pointer('pointercancel', 'touch');
            viewport().dispatchEvent(new Event('scroll'));
            await wait(1200);
            expect(isOpen()).toBe(true);

            // It was turned, so it closes soon after the finger lifts
            viewport().dispatchEvent(new TouchEvent('touchend', { bubbles: true }));
            await wait(350);
            fixture.detectChanges();
            expect(isOpen()).toBe(false);
        });

        it('waits a second for a first turn after opening', async () => {
            await create();
            await openByPress();

            await wait(700);
            expect(isOpen()).toBe(true);
            await wait(500);
            fixture.detectChanges();
            expect(isOpen()).toBe(false);
        });

        it('closes a fifth of a second after it stops turning, not while it turns', async () => {
            await create();
            await openByPress();

            // A flick keeps scrolling on its own for a while; each frame counts as turning
            for (let i = 0; i < 4; i++) {
                viewport().dispatchEvent(new Event('scroll'));
                await wait(120);
            }
            fixture.detectChanges();
            expect(isOpen()).toBe(true);

            await wait(200);
            fixture.detectChanges();
            expect(isOpen()).toBe(false);
        });

        it('stays open for the click that opened it, and closes on a number clicked after', async () => {
            await create();

            pointer('pointerdown');
            pointer('pointerup');
            item(3).click();
            fixture.detectChanges();
            expect(isOpen()).toBe(true);

            item(5).click();
            fixture.detectChanges();
            expect(isOpen()).toBe(false);
            expect(host.value()).toBe(5);
        });

        it('opens while the keyboard turns it, and closes on Escape', async () => {
            await create();

            press('ArrowDown');
            fixture.detectChanges();
            expect(isOpen()).toBe(true);

            press('Escape');
            fixture.detectChanges();
            expect(isOpen()).toBe(false);
            expect(host.value()).toBe(4);
        });

        it('opens when turned with a mouse wheel or trackpad', async () => {
            await create();

            viewport().dispatchEvent(new WheelEvent('wheel', { deltaY: 40, bubbles: true }));
            fixture.detectChanges();

            expect(isOpen()).toBe(true);
        });

        it('closes when focus moves elsewhere', async () => {
            await create();
            await openByPress();

            viewport().dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
            fixture.detectChanges();

            expect(isOpen()).toBe(false);
        });

        it('does not open when its value is set from outside', async () => {
            await create();

            host.value.set(9);
            await settle();

            expect(isOpen()).toBe(false);
        });
    });

    describe('typing a number', () => {
        const type = (...keys: string[]) => keys.forEach((key) => press(key));

        it('jumps to a typed digit', async () => {
            await create();

            type('7');

            expect(host.value()).toBe(7);
        });

        it('builds a number from digits typed in quick succession', async () => {
            await create();

            type('1', '5');

            expect(host.value()).toBe(15);
        });

        it('accepts a leading zero, as the numbers are shown', async () => {
            await create();

            type('0', '9');

            expect(host.value()).toBe(9);
        });

        it('starts again from the last digit when the number is not on the wheel', async () => {
            await create();

            // The wheel only goes up to 20
            type('4', '5');

            expect(host.value()).toBe(5);
        });

        it('starts a fresh number after a pause', async () => {
            await create();
            const now = vi.spyOn(Date, 'now');

            now.mockReturnValue(10_000);
            type('1');
            now.mockReturnValue(11_500);
            type('2');

            expect(host.value()).toBe(2);
        });

        it('turns the wheel to the typed number', async () => {
            await create();

            type('1', '2');
            await settle();
            await scrolled();

            expect(valueInMiddle()).toBe(12);
        });

        it('leaves shortcuts like Ctrl+1 alone', async () => {
            await create();

            viewport().dispatchEvent(
                new KeyboardEvent('keydown', { key: '1', ctrlKey: true, bubbles: true })
            );

            expect(host.value()).toBe(3);
        });
    });

    describe('keyboard', () => {
        it('moves one with the arrow keys and five with Page Up/Down', async () => {
            await create();

            press('ArrowDown');
            expect(host.value()).toBe(4);
            press('ArrowUp');
            press('ArrowUp');
            expect(host.value()).toBe(2);
            press('PageDown');
            expect(host.value()).toBe(7);
            press('PageUp');
            expect(host.value()).toBe(2);
        });

        it('jumps to the ends with Home and End, and stops there', async () => {
            await create();

            press('End');
            expect(host.value()).toBe(20);
            press('ArrowDown');
            press('PageDown');
            expect(host.value()).toBe(20);
            press('Home');
            press('ArrowUp');
            expect(host.value()).toBe(0);
        });

        it('turns the wheel to follow the keys', async () => {
            await create();

            press('PageDown');
            await settle();
            await scrolled();

            expect(valueInMiddle()).toBe(8);
        });
    });

    it('lines back up on its value after being moved in the page, as when a list item is dragged', async () => {
        await create();
        host.value.set(12);
        await settle();
        await scrolled();
        const wheel = fixture.nativeElement.querySelector('app-wheel-picker') as HTMLElement;

        // Taking a scrolled box out of the page and putting it back throws its scroll away
        const parent = wheel.parentNode!;
        const next = wheel.nextSibling;
        parent.removeChild(wheel);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        parent.insertBefore(wheel, next);
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(valueInMiddle()).toBe(12);
        expect(host.value()).toBe(12);
    });

    it('jumps straight to a chosen number when reduced motion is on', async () => {
        await create(true);

        item(9).click();
        await settle();

        // No smooth scroll to wait for
        expect(valueInMiddle()).toBe(9);
    });
});
