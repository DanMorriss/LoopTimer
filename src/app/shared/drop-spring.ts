import type { CdkDragMove, CdkDragRelease } from '@angular/cdk/drag-drop';
import { VelocityTracker } from './gesture';
import { criticallyDampedSpring } from './spring';

/**
 * Lets something dragged in a drop list (Angular CDK) settle into its place on the app's
 * spring, carrying on at the speed the finger let go of it, so there's no seam where the drag
 * ends. Hand it the drag's moves and its release:
 *
 *   (cdkDragMoved)="drop.moved($event)" (cdkDragReleased)="drop.released($event)"
 *
 * The settling itself is styles/_drag.scss, which this sets the spring of.
 */
export class DropSpring {
    private x = new VelocityTracker();
    private y = new VelocityTracker();

    moved(event: CdkDragMove) {
        this.x.add(event.pointerPosition.x, event.event.timeStamp);
        this.y.add(event.pointerPosition.y, event.event.timeStamp);
    }

    /** As it's let go, before the drop list moves it into place. */
    released(event: CdkDragRelease) {
        const at = event.event.timeStamp;
        const velocity = { x: this.x.velocity(at), y: this.y.velocity(at) };
        this.x = new VelocityTracker();
        this.y = new VelocityTracker();
        const preview = document.querySelector<HTMLElement>('.cdk-drag-preview');
        if (!preview) {
            return;
        }
        const from = preview.getBoundingClientRect();
        const to = event.source.getPlaceholderElement().getBoundingClientRect();
        const dx = to.left - from.left;
        const dy = to.top - from.top;
        const distance = Math.hypot(dx, dy);
        if (distance < 1) {
            return;
        }
        // The finger's speed along the way to its place (px/s), as a share of the way per
        // second; moving away from it counts against
        const along = (velocity.x * dx + velocity.y * dy) / distance;
        const { easing, duration } = criticallyDampedSpring(0.3, { velocity: along / distance });
        preview.style.setProperty('--drop-easing', easing);
        preview.style.setProperty('--drop-duration', `${duration}ms`);
    }
}
