import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TimerLibraryComponent } from './timer-library/timer-library.component';
import { TimerSetupComponent } from './timer-setup/timer-setup.component';
import { TimerComponent } from './timer/timer.component';

const routes: Routes = [
    { path: 'setup', component: TimerSetupComponent },
    { path: 'library', component: TimerLibraryComponent },
    { path: 'timer', component: TimerComponent}
    
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
