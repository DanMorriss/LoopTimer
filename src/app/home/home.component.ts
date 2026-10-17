import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { injectPrefersReducedMotion } from '../shared/reduced-motion';

@Component({
    selector: 'app-home',
    imports: [RouterLink],
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss',
})
export class HomeComponent {
    protected readonly reducedMotion = injectPrefersReducedMotion();
}
