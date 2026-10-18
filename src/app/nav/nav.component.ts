import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
    selector: 'app-nav',
    imports: [RouterLink],
    templateUrl: './nav.component.html',
    styleUrl: './nav.component.scss',
})
export class NavComponent {
    private readonly router = inject(Router);

    navigateToHome() {
        this.router.navigate(['/home']);
    }
}
