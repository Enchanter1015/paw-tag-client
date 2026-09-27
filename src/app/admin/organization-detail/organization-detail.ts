import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthStateService } from '../../core/services/auth-state.service';
import { LookupsService } from '../../core/services/lookups.service';
import { PageHeaderService } from '../../core/services/page-header.service';
import { UsersService } from '../../core/services/users.service';
import { VetHospitalsService } from '../../core/services/vet-hospitals.service';
import { Animal, ApiError, Lookup, User, VetHospital, VetHospitalMember } from '../../core/models/models';
import { PtAvatar } from '../../shared/pt-avatar/pt-avatar';
import { PtButton } from '../../shared/pt-button/pt-button';
import { PtInput } from '../../shared/pt-input/pt-input';
import { PtTag } from '../../shared/pt-tag/pt-tag';

type OrgTab = 'members' | 'animals';

@Component({
  selector: 'app-organization-detail',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PtAvatar, PtButton, PtInput, PtTag],
  templateUrl: './organization-detail.html',
  styleUrl: './organization-detail.scss',
})
export class OrganizationDetail { 
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly vetHospitalsService = inject(VetHospitalsService);
  private readonly usersService = inject(UsersService);
  private readonly lookupsService = inject(LookupsService);
  private readonly pageHeader = inject(PageHeaderService);
  protected readonly authState = inject(AuthStateService);

  readonly orgId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly vetHospitalTypes = signal<Lookup[]>([]);
  readonly roles = signal<Lookup[]>([]);
  // Platform-level roles ('Admin', 'User') live in the same table but don't apply to org membership.
  private static readonly NON_MEMBER_ROLES = new Set(['admin', 'user']);
  readonly assignableRoles = computed(() =>
    this.roles().filter((role) => !OrganizationDetail.NON_MEMBER_ROLES.has(role.name.toLowerCase()))
  );

  readonly organization = signal<VetHospital | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);

  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly editForm = this.fb.group({
    name: this.fb.control('', [Validators.required, Validators.maxLength(150)]),
    phoneNo: this.fb.control(''),
    address: this.fb.control(''),
    businessEmail: this.fb.control('', [Validators.email]),
    vetHospitalTypeId: this.fb.control('', [Validators.required]),
    isVerified: this.fb.control(false),
  });

  readonly activeTab = signal<OrgTab>('members');

  readonly members = signal<VetHospitalMember[]>([]);
  readonly memberUsers = signal<Map<string, User>>(new Map());
  readonly membersLoading = signal(false);
  readonly membersError = signal<string | null>(null);

  readonly addMemberForm = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.email]),
    roleId: this.fb.control('', [Validators.required]),
  });
  readonly addingMember = signal(false);
  readonly addMemberError = signal<string | null>(null);

  readonly orgAnimals = signal<Animal[]>([]);
  readonly animalsLoading = signal(false);
  readonly animalsError = signal<string | null>(null);

  constructor() {
    this.updateHeader();
    this.lookupsService.getVetHospitalTypes().subscribe((types) => this.vetHospitalTypes.set(types));
    this.lookupsService.getRoles().subscribe((roles) => this.roles.set(roles));

    if (!this.orgId) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }

    this.vetHospitalsService.getById(this.orgId).subscribe({
      next: (org) => {
        this.organization.set(org);
        this.loading.set(false);
        this.updateHeader();
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
    this.loadMembers(this.orgId);
    this.loadOrgAnimals(this.orgId);
  }

  vetHospitalTypeName(vetHospitalTypeId: number): string {
    return this.vetHospitalTypes().find((type) => type.id === vetHospitalTypeId)?.name ?? 'Organization';
  }

  roleName(roleId: number): string {
    return this.roles().find((role) => role.id === roleId)?.name ?? 'Unknown role';
  }

  memberName(userId: string): string {
    return this.memberUsers().get(userId)?.name ?? userId;
  }

  fieldError(control: AbstractControl, requiredMessage: string): string | null {
    if (!control.touched) {
      return null;
    }
    if (control.hasError('required')) {
      return requiredMessage;
    }
    if (control.hasError('email')) {
      return 'Enter a valid email address.';
    }
    if (control.hasError('server')) {
      return control.getError('server');
    }
    return null;
  }

  startEditing(): void {
    const org = this.organization();
    if (!org || !this.authState.isAdministrator()) {
      return;
    }
    this.editForm.setValue({
      name: org.name,
      phoneNo: org.phoneNo ?? '',
      address: org.address ?? '',
      businessEmail: org.businessEmail ?? '',
      vetHospitalTypeId: String(org.vetHospitalTypeId),
      isVerified: org.isVerified,
    });
    this.formError.set(null);
    this.editing.set(true);
    this.updateHeader();
  }

  cancelEditing(): void {
    this.editing.set(false);
    this.formError.set(null);
    this.updateHeader();
  }

  saveEdit(): void {
    const org = this.organization();
    if (!org) {
      return;
    }
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const { name, phoneNo, address, businessEmail, vetHospitalTypeId, isVerified } = this.editForm.getRawValue();
    this.saving.set(true);
    this.formError.set(null);

    this.vetHospitalsService
      .update(org.id, {
        name: name!,
        vetHospitalTypeId: Number(vetHospitalTypeId),
        phoneNo: phoneNo || undefined,
        address: address || undefined,
        businessEmail: businessEmail || undefined,
        isVerified: isVerified ?? false,
      })
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.editing.set(false);
          this.organization.set(updated);
          this.updateHeader();
        },
        error: (response: HttpErrorResponse) => {
          this.saving.set(false);
          this.formError.set(this.applyFieldErrors(response, this.editForm));
        },
      });
  }

  addMember(): void {
    const org = this.organization();
    if (!org || !this.authState.isAdministrator() || this.addMemberForm.invalid) {
      this.addMemberForm.markAllAsTouched();
      return;
    }

    const { email, roleId } = this.addMemberForm.getRawValue();
    this.addingMember.set(true);
    this.addMemberError.set(null);

    this.usersService.findByEmail(email!.trim()).subscribe({
      next: (user) => {
        this.vetHospitalsService.addMember(org.id, { userId: user.id, roleId: Number(roleId) }).subscribe({
          next: (member) => {
            this.addingMember.set(false);
            this.members.update((members) => [...members, member]);
            this.memberUsers.update((users) => new Map(users).set(user.id, user));
            this.addMemberForm.reset({ email: '', roleId: '' });
          },
          error: (response: HttpErrorResponse) => {
            this.addingMember.set(false);
            const apiError = response.error as ApiError | undefined;
            this.addMemberError.set(apiError?.error?.message ?? 'Could not add member. Please try again.');
          },
        });
      },
      error: () => {
        this.addingMember.set(false);
        this.addMemberError.set(`No user found for "${email}".`);
      },
    });
  }

  private loadMembers(orgId: string): void {
    this.membersLoading.set(true);
    this.membersError.set(null);

    this.vetHospitalsService.listMembers(orgId).subscribe({
      next: (members) => {
        this.members.set(members);
        this.membersLoading.set(false);
        this.loadMemberUsers(members);
      },
      error: () => {
        this.membersLoading.set(false);
        this.membersError.set('Could not load members. Please try again.');
      },
    });
  }

  private loadMemberUsers(members: VetHospitalMember[]): void {
    const userIds = [...new Set(members.map((member) => member.userId))];
    if (userIds.length === 0) {
      return;
    }
    forkJoin(userIds.map((id) => this.usersService.getById(id))).subscribe((users) => {
      this.memberUsers.set(new Map(users.map((user) => [user.id, user])));
    });
  }

  private loadOrgAnimals(orgId: string): void {
    this.animalsLoading.set(true);
    this.animalsError.set(null);

    this.vetHospitalsService.listAnimals(orgId).subscribe({
      next: (animals) => {
        this.orgAnimals.set(animals);
        this.animalsLoading.set(false);
      },
      error: () => {
        this.animalsLoading.set(false);
        this.animalsError.set('Could not load animals. Please try again.');
      },
    });
  }

  private updateHeader(): void {
    if (this.editing()) {
      this.pageHeader.set({
        title: () => `Edit ${this.organization()?.name ?? ''}`.trim(),
        left: { kind: 'close', onClick: () => this.cancelEditing() },
        action: {
          kind: 'save',
          label: () => (this.saving() ? 'Saving…' : 'Save'),
          disabled: () => this.saving(),
          onClick: () => this.saveEdit(),
        },
      });
      return;
    }

    this.pageHeader.set({
      title: () => this.organization()?.name ?? 'Organization',
      left: { kind: 'back' },
      action:
        this.organization() && this.authState.isAdministrator()
          ? { kind: 'edit', onClick: () => this.startEditing() }
          : undefined,
    });
  }

  private applyFieldErrors(response: HttpErrorResponse, form: FormGroup): string {
    const apiError = response.error as ApiError | undefined;
    const details = apiError?.error?.details;

    if (response.status === 400 && details?.length) {
      for (const detail of details) {
        const field = detail.path.split('.').pop();
        const control = field ? form.get(field) : null;
        if (control) {
          control.setErrors({ server: detail.message });
          control.markAsTouched();
        }
      }
      return 'Check the highlighted fields and try again.';
    }

    return apiError?.error?.message ?? 'Something went wrong. Please try again.';
  }
}
