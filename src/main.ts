import { inject, provideAppInitializer } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withNavigationErrorHandler } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { reloadOnStaleCode } from './app/nav/stale-code';
import { AlarmService } from './app/shared/alarms/alarm.service';
import { ActiveRunService } from './app/shared/run/active-run.service';
import { ThemeService } from './app/shared/theme/theme.service';

bootstrapApplication(AppComponent, {
    providers: [
        // A tab on an older build loads the page afresh when the page's code has gone
        provideRouter(routes, withNavigationErrorHandler(reloadOnStaleCode)),
        provideAppInitializer(() => {
            // Start listening for the first tap straight away, so sound is unlocked by the
            // time a workout starts (browsers only allow sound after an interaction)
            inject(AlarmService);
            // Apply the theme setting, and keep following it
            inject(ThemeService);
            // Pick up a workout already going (after a refresh), whichever page this is
            inject(ActiveRunService);
        }),
    ],
}).catch((err) => console.error(err));
