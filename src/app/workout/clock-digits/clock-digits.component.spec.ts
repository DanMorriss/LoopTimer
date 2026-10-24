import { TestBed } from '@angular/core/testing';

import { ClockDigitsComponent } from './clock-digits.component';

describe('ClockDigitsComponent', () => {
    function render(time: string) {
        const fixture = TestBed.createComponent(ClockDigitsComponent);
        fixture.componentRef.setInput('time', time);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    it('gives screen readers the time as one piece of text', () => {
        const element = render('00:41');

        expect(element.querySelector('.sr-only')!.textContent!.trim()).toBe('00:41');
        expect(element.querySelector('.clock')!.getAttribute('aria-hidden')).toBe('true');
    });

    it('puts each digit in a cell of the same width, and the colon between them', () => {
        const element = render('00:41');
        const cells = [...element.querySelectorAll<HTMLElement>('.clock > span')];

        expect(cells.map((cell) => [cell.className, cell.textContent])).toEqual([
            ['clock__digit', '0'],
            ['clock__digit', '0'],
            ['clock__mark', ':'],
            ['clock__digit', '4'],
            ['clock__digit', '1'],
        ]);
        const widths = cells
            .filter((cell) => cell.className === 'clock__digit')
            .map((cell) => cell.getBoundingClientRect().width);
        expect(new Set(widths).size).toBe(1);
    });
});
