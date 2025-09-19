import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { NavComponent } from './nav/nav.component';
import { TimerSetupComponent } from './timer-setup/timer-setup.component';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
    imports: [TimerSetupComponent, RouterLink, RouterLinkActive, RouterOutlet, NavComponent, HomeComponent]
})
export class AppComponent {
  title = 'loop-timer';
}
