import { inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { AlarmService } from './app/shared/alarms/alarm.service';
import { ThemeService } from './app/shared/theme/theme.service';

bootstrapApplication(AppComponent, {
    providers: [
        provideZoneChangeDetection(),
        provideRouter(routes),
        provideAppInitializer(() => {
            // Start listening for the first tap straight away, so sound is unlocked by the
            // time a timer starts (browsers only allow sound after an interaction)
            inject(AlarmService);
            // Apply the theme setting, and keep following it
            inject(ThemeService);
        }),
    ],
}).catch((err) => console.error(err));
