// How far a step's name may shrink to fit, and in what steps
const FLOOR = 0.7;
const STEP = 0.05;

/**
 * Fits a step's name (`label`) on the face: at its full size if it fits, otherwise on two
 * balanced lines (see workout-steps.scss), shrinking only as far as it needs to, down to FLOOR
 * of its size. A name too long for that, e.g. "Single-leg Romanian deadlift" on a phone, gets a
 * third line, and the same again; past that its last line ends in "…". Measured, rather than
 * worked out from the number of letters, as the display face's letters differ a lot in width.
 */
export function fitName(label: HTMLElement, maxLines = 3) {
    label.style.fontSize = '';
    const full = parseFloat(getComputedStyle(label).fontSize);
    for (let lines = 2; lines <= maxLines; lines++) {
        if (shrinkToFit(label, full, lines)) {
            return;
        }
    }
}

/** Shrinks `label` from `full` until it fits in `lines` lines, if it can by FLOOR. */
function shrinkToFit(label: HTMLElement, full: number, lines: number): boolean {
    for (let scale = 1; scale >= FLOOR - 1e-9; scale -= STEP) {
        label.style.fontSize = scale === 1 ? '' : `${full * scale}px`;
        if (fits(label, lines)) {
            return true;
        }
    }
    return false;
}

/** No word wider than the line, and no more than `lines` lines of it. */
function fits(label: HTMLElement, lines: number): boolean {
    const style = getComputedStyle(label);
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
    // Counted to the nearest line, as letters' tails reach a little past a tight line height;
    // and a pixel's grace for rounding across
    return (
        label.scrollWidth <= label.clientWidth + 1 &&
        Math.round(label.scrollHeight / lineHeight) <= lines
    );
}
