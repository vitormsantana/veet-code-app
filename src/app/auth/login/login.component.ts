import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  isSubmitting = false;
  errorMessage = '';

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.getRawValue();

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      await this.authService.signInWithEmail(email, password);
    } catch (error) {
      this.errorMessage = this.extractErrorMessage(error);
    } finally {
      this.isSubmitting = false;
    }
  }

  connectWithGoogle(): void {
    console.info('[LoginComponent] Google sign-in button clicked');
    this.authService.signInWithGoogle();
  }

  get emailInvalid(): boolean {
    const control = this.loginForm.controls.email;
    return control.invalid && control.touched;
  }

  get passwordInvalid(): boolean {
    const control = this.loginForm.controls.password;
    return control.invalid && control.touched;
  }

  private extractErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
      return (error as { message: string }).message;
    }

    return 'Unable to sign in. Please try again.';
  }
}
