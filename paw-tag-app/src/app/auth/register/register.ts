import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiError } from '../../core/models/models';
import { PtButton } from '../../shared/pt-button/pt-button';
import { PtCard } from '../../shared/pt-card/pt-card';
import { PtInput } from '../../shared/pt-input/pt-input';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PtButton, PtCard, PtInput],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.group({
    name: this.fb.control('', [Validators.required]),
    email: this.fb.control('', [Validators.required, Validators.email]),
    password: this.fb.control('', [Validators.required, Validators.minLength(8)]),
  });

  readonly submitting = signal(false);
  readonly formError = signal<string | null>(null);

  get name() {
    return this.form.controls.name;
  }

  get email() {
    return this.form.controls.email;
  }

  get password() {
    return this.form.controls.password;
  }

  nameError(): string | null {
    if (this.name.touched && this.name.hasError('required')) {
      return 'Enter your name.';
    }
    return null;
  }

  emailError(): string | null {
    if (!this.email.touched) {
      return null;
    }
    if (this.email.hasError('required')) {
      return 'Enter your email address.';
    }
    if (this.email.hasError('email')) {
      return 'Enter a valid email address.';
    }
    if (this.email.hasError('server')) {
      return this.email.getError('server');
    }
    return null;
  }

  passwordError(): string | null {
    if (!this.password.touched) {
      return null;
    }
    if (this.password.hasError('required')) {
      return 'Enter a password.';
    }
    if (this.password.hasError('minlength')) {
      return 'Password must be at least 8 characters.';
    }
    return null;
  }

  submit(): void {
    this.formError.set(null);
    this.email.setErrors(null);
    this.email.updateValueAndValidity();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, email, password } = this.form.getRawValue();
    this.submitting.set(true);

    this.authService.register({ name: name!, email: email!, password: password! }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigateByUrl('/');
      },
      error: (response: HttpErrorResponse) => {
        this.submitting.set(false);
        this.applyServerError(response);
      },
    });
  }

  private applyServerError(response: HttpErrorResponse): void {
    const apiError = response.error as ApiError | undefined;

    if (response.status === 409) {
      this.email.setErrors({ server: 'This email is already registered.' });
      this.email.markAsTouched();
      return;
    }

    this.formError.set(apiError?.error?.message ?? 'Something went wrong. Please try again.');
  }
}
