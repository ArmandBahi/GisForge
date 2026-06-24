import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgxSonnerToaster } from 'ngx-sonner';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NgxSonnerToaster],
  template: `
    <router-outlet />
    <ngx-sonner-toaster position="top-right" richColors />
  `,
})
export class AppComponent {}
