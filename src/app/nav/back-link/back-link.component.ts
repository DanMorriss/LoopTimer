import { Component, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PageSlide } from '../page-slide';

/**
 * ‹ and where it goes back to, at the top of a page that slides in over another (an exercise
 * over the list, Settings or the legal pages over Account). It slides the page back off.
 */
@Component({
    selector: 'app-back-link',
    imports: [MatIconModule],
    template: `
        <a [href]="url()" class="back-link" (click)="slide.follow($event, url(), 'out')">
            <mat-icon aria-hidden="true">chevron_left</mat-icon>
            {{ label() }}
        </a>
    `,
    styleUrl: './back-link.component.scss',
})
export class BackLinkComponent {
    /** Where it goes, e.g. "/account". */
    readonly url = input.required<string>();
    /** The page it goes back to, e.g. "Account". */
    readonly label = input.required<string>();

    protected readonly slide = inject(PageSlide);
}
