import { Component } from '@angular/core';

// Temporary placeholder until PR 2 adds the real login screen; keeps authGuard's redirect target valid.
@Component({
  selector: 'app-login-placeholder',
  standalone: true,
  template: `<p>Sign in screen coming soon.</p>`,
})
export class LoginPlaceholder {}
