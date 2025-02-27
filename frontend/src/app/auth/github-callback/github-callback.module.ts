import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { GithubCallbackComponent } from './github-callback.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    GithubCallbackComponent,
  ],
})
export class GithubCallbackModule {}
