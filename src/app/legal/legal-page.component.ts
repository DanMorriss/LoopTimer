import { Component, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PageSlide } from '../nav/page-slide';
import { SwipeBackDirective } from '../nav/swipe-back.directive';

/** Where the legal pages are linked from, and go back to. */
const BACK_URL = '/settings';

/**
 * The frame of the Privacy notice and Terms of use: ‹ Settings, the title, when it was last
 * changed, and the text. It slides in over Settings, and back off with ‹ Settings or a swipe
 * right, as an exercise's page does over the list.
 */
@Component({
    selector: 'app-legal-page',
    imports: [MatIconModule, SwipeBackDirective],
    template: `
        <div class="flex justify-center" [appSwipeBack]="backUrl">
            <article
                class="m-4 w-full max-w-md rounded-xl border border-(--panel-border) bg-(--panel) p-5 shadow-xl shadow-(color:--shadow)"
                aria-labelledby="legal-title"
            >
                <a
                    [href]="backUrl"
                    class="legal__back"
                    (click)="slide.follow($event, backUrl, 'out')"
                >
                    <mat-icon aria-hidden="true">chevron_left</mat-icon>
                    Settings
                </a>
                <h2 class="legal__title" id="legal-title">{{ heading() }}</h2>
                <p class="legal__updated">Last updated {{ updated() }}</p>
                <ng-content />
            </article>
        </div>
    `,
    styleUrl: './legal-page.component.scss',
})
export class LegalPageComponent {
    /** e.g. "Privacy notice". */
    readonly heading = input.required<string>();
    /** When the text last changed, e.g. "26 October 2026". */
    readonly updated = input.required<string>();

    protected readonly backUrl = BACK_URL;
    protected readonly slide = inject(PageSlide);
}
