import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-nav',
    templateUrl: './nav.component.html',
    styleUrl: './nav.component.scss',
})
export class NavComponent {
    private readonly router = inject(Router);

    navigateToHome() {
        this.router.navigate(['/home']);
    }
}
