import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss',
  imports: []
})
export class NavComponent {
  
  constructor(private router: Router) {}

  navigateToHome() {
    this.router.navigate(['/home']);
  }
}
