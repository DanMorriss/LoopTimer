import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TimerLibraryComponent } from './timer-library/timer-library.component';
import { TimerSetupComponent } from './timer-setup/timer-setup.component';

const routes: Routes = [
    { path: 'setup', component: TimerSetupComponent },
    { path: 'library', component: TimerLibraryComponent },
    
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
