import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { AppRoutingModule } from './app/app-routing.module';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { AppComponent } from './app/app.component';
import { importProvidersFrom } from '@angular/core';

bootstrapApplication(AppComponent, {
    providers: [
        importProvidersFrom(BrowserModule, AppRoutingModule, FormsModule, MatButtonModule),
        provideAnimationsAsync()
    ]
})
  .catch(err => console.error(err));
