import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PageHeaderService } from '../../core/services/page-header.service';
import { UsersService } from '../../core/services/users.service';
import { LookupsService } from '../../core/services/lookups.service';
import { ApiError, Lookup, User } from '../../core/models/models';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { PtAvatar } from '../../shared/pt-avatar/pt-avatar';
import { PtButton } from '../../shared/pt-button/pt-button';
import { PtCard } from '../../shared/pt-card/pt-card';
import { PtInput } from '../../shared/pt-input/pt-input';
import { PtTag } from '../../shared/pt-tag/pt-tag';

type PendingAction = { type: 'role'; roleId: number } | { type: 'deactivate' } | { type: 'activate' };

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [ReactiveFormsModule, ConfirmDialog, PtAvatar, PtButton, PtCard, PtInput, PtTag],
  templateUrl: './user-management.html',
  styleUrl: './user-management.scss',
})
export class UserManagement {
  private readonly fb = inject(FormBuilder);
  private readonly usersService = inject(UsersService);
  private readonly lookupsService = inject(LookupsService);

  readonly searchForm = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.email]),
  });

  constructor() {
    inject(PageHeaderService).set({ title: () => 'User management', left: { kind: 'back' } });
    this.lookupsService.getRoles().subscribe((roles) => this.roles.set(roles));
  }

  readonly user = signal<User | null>(null);
  readonly searching = signal(false);
  readonly searchError = signal<string | null>(null);

  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);

  readonly roles = signal<Lookup[]>([]);
  readonly roleActionError = signal<string | null>(null);
  readonly selectedRoleId = signal<number | null>(null);
  readonly pendingAction = signal<PendingAction | null>(null);
  readonly actionInFlight = signal(false);

  roleName(roleId: number): string {
    return this.roles().find((role) => role.id === roleId)?.name ?? 'Unknown role';
  }

  readonly editForm = this.fb.group({
    name: this.fb.control('', [Validators.required, Validators.maxLength(150)]),
    email: this.fb.control('', [Validators.required, Validators.email]),
    phoneNo: this.fb.control(''),
    address: this.fb.control(''),
  });

  get email() {
    return this.searchForm.controls.email;
  }

  get editName() {
    return this.editForm.controls.name;
  }

  get editEmail() {
    return this.editForm.controls.email;
  }

  editNameError(): string | null {
    if (!this.editName.touched) {
      return null;
    }
    if (this.editName.hasError('required')) {
      return "Enter the user's name.";
    }
    if (this.editName.hasError('maxlength')) {
      return 'Name must be 150 characters or fewer.';
    }
    if (this.editName.hasError('server')) {
      return this.editName.getError('server');
    }
    return null;
  }

  editEmailError(): string | null {
    if (!this.editEmail.touched) {
      return null;
    }
    if (this.editEmail.hasError('required')) {
      return 'Enter an email address.';
    }
    if (this.editEmail.hasError('email')) {
      return 'Enter a valid email address.';
    }
    if (this.editEmail.hasError('server')) {
      return this.editEmail.getError('server');
    }
    return null;
  }

  search(): void {
    if (this.searchForm.invalid) {
      this.searchForm.markAllAsTouched();
      return;
    }

    const email = this.searchForm.getRawValue().email!.trim();
    this.searching.set(true);
    this.searchError.set(null);
    this.roleActionError.set(null);
    this.user.set(null);
    this.editing.set(false);

    this.usersService.findByEmail(email).subscribe({
      next: (user) => {
        this.searching.set(false);
        this.user.set(user);
        this.selectedRoleId.set(user.roleId);
      },
      error: () => {
        this.searching.set(false);
        this.searchError.set(`No user found for "${email}".`);
      },
    });
  }

  startEditing(): void {
    const user = this.user();
    if (!user) {
      return;
    }
    this.editForm.setValue({
      name: user.name,
      email: user.email,
      phoneNo: user.phoneNo ?? '',
      address: user.address ?? '',
    });
    this.formError.set(null);
    this.editing.set(true);
  }

  cancelEditing(): void {
    this.editing.set(false);
    this.formError.set(null);
  }

  save(): void {
    const user = this.user();
    if (!user) {
      return;
    }

    this.formError.set(null);
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const { name, email, phoneNo, address } = this.editForm.getRawValue();
    this.saving.set(true);

    this.usersService
      .update(user.id, {
        name: name!,
        email: email!,
        phoneNo: phoneNo || undefined,
        address: address || undefined,
      })
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.user.set(updated);
          this.editing.set(false);
        },
        error: (response: HttpErrorResponse) => {
          this.saving.set(false);
          this.applyServerError(response);
        },
      });
  }

  requestRoleChange(): void {
    const user = this.user();
    const roleId = this.selectedRoleId();
    if (!user || roleId === null || roleId === user.roleId) {
      return;
    }
    this.roleActionError.set(null);
    this.pendingAction.set({ type: 'role', roleId });
  }

  requestDeactivate(): void {
    this.roleActionError.set(null);
    this.pendingAction.set({ type: 'deactivate' });
  }

  requestActivate(): void {
    this.roleActionError.set(null);
    this.pendingAction.set({ type: 'activate' });
  }

  cancelPendingAction(): void {
    this.pendingAction.set(null);
  }

  dialogTitle(): string {
    switch (this.pendingAction()?.type) {
      case 'role':
        return 'Change this user’s role?';
      case 'deactivate':
        return 'Deactivate this user?';
      case 'activate':
        return 'Reactivate this user?';
      default:
        return '';
    }
  }

  dialogMessage(): string {
    const user = this.user();
    const action = this.pendingAction();
    if (!user || !action) {
      return '';
    }
    switch (action.type) {
      case 'role':
        return `${user.name}'s role will change to "${this.roleName(action.roleId)}".`;
      case 'deactivate':
        return `${user.name} will no longer be able to sign in until reactivated.`;
      case 'activate':
        return `${user.name} will be able to sign in again.`;
    }
  }

  dialogConfirmLabel(): string {
    if (this.actionInFlight()) {
      return 'Working…';
    }
    switch (this.pendingAction()?.type) {
      case 'role':
        return 'Change role';
      case 'deactivate':
        return 'Deactivate';
      case 'activate':
        return 'Reactivate';
      default:
        return 'Confirm';
    }
  }

  confirmPendingAction(): void {
    const user = this.user();
    const action = this.pendingAction();
    if (!user || !action) {
      return;
    }

    this.actionInFlight.set(true);

    let request$;
    switch (action.type) {
      case 'role':
        request$ = this.usersService.changeRole(user.id, action.roleId);
        break;
      case 'deactivate':
        request$ = this.usersService.deactivate(user.id);
        break;
      case 'activate':
        request$ = this.usersService.activate(user.id);
        break;
    }

    request$.subscribe({
      next: (updated) => {
        this.actionInFlight.set(false);
        this.pendingAction.set(null);
        this.user.set(updated);
        this.selectedRoleId.set(updated.roleId);
      },
      error: (response: HttpErrorResponse) => {
        this.actionInFlight.set(false);
        this.pendingAction.set(null);
        const apiError = response.error as ApiError | undefined;
        this.roleActionError.set(apiError?.error?.message ?? 'Something went wrong. Please try again.');
      },
    });
  }

  private applyServerError(response: HttpErrorResponse): void {
    const apiError = response.error as ApiError | undefined;
    const details = apiError?.error?.details;

    if (response.status === 400 && details?.length) {
      for (const detail of details) {
        const field = detail.path.split('.').pop();
        if (field === 'name' || field === 'email') {
          this.editForm.controls[field].setErrors({ server: detail.message });
          this.editForm.controls[field].markAsTouched();
        }
      }
      this.formError.set('Check the highlighted fields and try again.');
      return;
    }

    this.formError.set(apiError?.error?.message ?? 'Something went wrong. Please try again.');
  }
}
