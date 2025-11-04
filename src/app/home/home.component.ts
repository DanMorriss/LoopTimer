import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  
  constructor(private router: Router) {}

  navigateToCreate() {
    this.router.navigate(['/setup']);
  }

  navigateToLibrary() {
    this.router.navigate(['/library']);
  }
}
