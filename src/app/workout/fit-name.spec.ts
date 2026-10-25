import { fitName } from './fit-name';

describe('fitName', () => {
    let box: HTMLElement;
    let label: HTMLElement;

    // The name's styles from workout-steps.scss, at a set size, in a box of a set width
    beforeEach(() => {
        box = document.createElement('div');
        label = document.createElement('p');
        Object.assign(label.style, {
            margin: '0',
            lineHeight: '1.1',
            textWrap: 'balance',
            display: '-webkit-box',
            webkitBoxOrient: 'vertical',
            webkitLineClamp: '3',
            overflow: 'hidden',
        });
        box.style.fontSize = '36px';
        box.append(label);
        document.body.append(box);
    });
    afterEach(() => box.remove());

    /** How wide `text` is at the full size, on one line. */
    function width(text: string): number {
        const span = document.createElement('span');
        span.style.whiteSpace = 'nowrap';
        span.textContent = text;
        box.append(span);
        const result = span.getBoundingClientRect().width;
        span.remove();
        return result;
    }

    function fit(text: string, boxWidth: number) {
        label.textContent = text;
        box.style.width = `${boxWidth}px`;
        fitName(label);
    }

    const size = () => parseFloat(getComputedStyle(label).fontSize);
    const lines = () =>
        Math.round(label.scrollHeight / parseFloat(getComputedStyle(label).lineHeight));

    it('leaves a name that fits on one line as it is', () => {
        fit('Squats', width('Squats') + 10);

        expect(label.style.fontSize).toBe('');
        expect(lines()).toBe(1);
    });

    it('wraps onto two lines, at full size, before shrinking', () => {
        fit('Bodyweight squat', width('Bodyweight') + 10);

        expect(label.style.fontSize).toBe('');
        expect(lines()).toBe(2);
    });

    it('shrinks only as far as the longest word needs', () => {
        const longest = width('Bodyweight');
        fit('Bodyweight squat', longest * 0.85);

        expect(size()).toBeLessThan(36);
        // One step larger wouldn't have fitted
        expect(size()).toBeGreaterThan(36 * 0.85 - 36 * 0.05 - 0.5);
        expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth + 1);
        expect(lines()).toBe(2);
    });

    it('gives a name a third line when two would need it smaller than 70%', () => {
        const box = width('Single-leg') + 10;
        // Neither way of putting it on two lines fits, even at 70%
        expect(width('Single-leg Romanian') * 0.7).toBeGreaterThan(box);
        expect(width('Romanian deadlift') * 0.7).toBeGreaterThan(box);

        fit('Single-leg Romanian deadlift', box);

        expect(label.style.fontSize).toBe('');
        expect(lines()).toBe(3);
    });

    it('goes no smaller than 70%, with "…" past that', () => {
        fit('One two three four five six seven eight nine ten', width('eight') * 1.5);

        expect(size()).toBeCloseTo(36 * 0.7, 1);
    });

    it('starts again from full size, e.g. when the screen gets wider', () => {
        fit('Bodyweight squat', width('Bodyweight') * 0.85);
        expect(size()).toBeLessThan(36);

        fit('Bodyweight squat', width('Bodyweight squat') + 10);
        expect(label.style.fontSize).toBe('');
    });
});
