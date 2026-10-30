import type { CdkDragMove, CdkDragRelease } from '@angular/cdk/drag-drop';

import { DropSpring } from './drop-spring';

describe('DropSpring', () => {
    let preview: HTMLElement;
    let placeholder: HTMLElement;

    beforeEach(() => {
        preview = document.createElement('div');
        preview.className = 'cdk-drag-preview';
        preview.style.cssText = 'position: fixed; left: 0; top: 300px; width: 100px; height: 40px';
        placeholder = document.createElement('div');
        placeholder.style.cssText =
            'position: fixed; left: 0; top: 100px; width: 100px; height: 40px';
        document.body.append(preview, placeholder);
    });

    afterEach(() => {
        preview.remove();
        placeholder.remove();
    });

    const move = (y: number, timeStamp: number) =>
        ({ pointerPosition: { x: 50, y }, event: { timeStamp } }) as unknown as CdkDragMove;
    const release = (timeStamp: number) =>
        ({
            source: { getPlaceholderElement: () => placeholder },
            event: { timeStamp },
        }) as unknown as CdkDragRelease;

    it('settles on the spring, carrying on at the speed it was let go', () => {
        const drop = new DropSpring();
        // Moving up towards its place, fast
        drop.moved(move(500, 0));
        drop.moved(move(400, 50));

        drop.released(release(50));

        // A spring already moving gets there sooner than one starting from still
        const thrown = parseInt(preview.style.getPropertyValue('--drop-duration'));
        const still = new DropSpring();
        still.released(release(1000));
        const fromStill = parseInt(preview.style.getPropertyValue('--drop-duration'));
        expect(preview.style.getPropertyValue('--drop-easing')).not.toBe('');
        expect(thrown).toBeGreaterThan(0);
        expect(thrown).toBeLessThan(fromStill);
    });

    it('leaves the drop alone when there is no copy following the finger', () => {
        preview.remove();
        const drop = new DropSpring();

        expect(() => drop.released(release(0))).not.toThrow();
    });
});
