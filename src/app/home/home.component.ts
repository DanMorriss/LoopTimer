import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
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
