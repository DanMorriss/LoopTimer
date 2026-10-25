/** Where the last click landed on screen, and when, so a dialog it opens can grow out of it. */
let lastClick: { x: number; y: number; at: number } | null = null;

/** ms: a click older than this didn't open the dialog, which then grows from its middle. */
const RECENT = 1000;

if (typeof document !== 'undefined') {
    document.addEventListener(
        'click',
        (event) => {
            // A click from the keyboard (Enter or Space on a button) has no position: use the
            // middle of what it pressed
            const at = performance.now();
            if (event.detail === 0 && event.target instanceof Element) {
                const rect = event.target.getBoundingClientRect();
                lastClick = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, at };
            } else {
                lastClick = { x: event.clientX, y: event.clientY, at };
            }
        },
        { capture: true, passive: true }
    );
}

/**
 * Grows a dialog's card out of the button that opened it, and back into it as it closes,
 * rather than from the middle of the screen: sets its transform-origin to where the click
 * that opened it was. Call it once the card is on the page. Opened some other way (no click
 * just before), it grows from its middle as before.
 */
export function growFromClick(card: HTMLElement) {
    if (!lastClick || performance.now() - lastClick.at > RECENT) {
        return;
    }
    // Its box before it's scaled, which scaling about its middle keeps centred
    const rect = card.getBoundingClientRect();
    const left = rect.left + rect.width / 2 - card.offsetWidth / 2;
    const top = rect.top + rect.height / 2 - card.offsetHeight / 2;
    card.style.transformOrigin = `${lastClick.x - left}px ${lastClick.y - top}px`;
}
