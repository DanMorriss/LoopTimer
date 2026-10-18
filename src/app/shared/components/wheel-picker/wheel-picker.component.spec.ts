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
        it('shows three rows, with the selected one in the middle', async () => {
            await create();

            expect(viewport().clientHeight).toBe(3 * rowHeight());
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
