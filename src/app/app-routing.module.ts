import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TimerSetupComponent } from './timer-setup/timer-setup.component';

const routes: Routes = [
    { path: '', component: TimerSetupComponent },
    
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
