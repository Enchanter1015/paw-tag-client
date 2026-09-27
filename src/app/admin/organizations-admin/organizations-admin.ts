import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime } from 'rxjs';
import { LookupsService } from '../../core/services/lookups.service';
import { PageHeaderService } from '../../core/services/page-header.service';
import { VetHospitalsService } from '../../core/services/vet-hospitals.service';
import { ApiError, Lookup, VetHospital } from '../../core/models/models';
import { PtButton } from '../../shared/pt-button/pt-button';
import { PtInput } from '../../shared/pt-input/pt-input';
import { PtTag } from '../../shared/pt-tag/pt-tag';

@Component({
  selector: 'app-organizations-admin',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PtButton, PtInput, PtTag],
  templateUrl: './organizations-admin.html',
  styleUrl: './organizations-admin.scss',
})
export class OrganizationsAdmin {
  private readonly fb = inject(FormBuilder);
  private readonly vetHospitalsService = inject(VetHospitalsService);
  private readonly lookupsService = inject(LookupsService);
  private readonly router = inject(Router);

  readonly vetHospitalTypes = signal<Lookup[]>([]);

  readonly searchForm = this.fb.group({ name: this.fb.control('') });
  readonly organizations = signal<VetHospital[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  readonly creating = signal(false);
  readonly creatingInFlight = signal(false);
  readonly createError = signal<string | null>(null);
  readonly createForm = this.fb.group({
    name: this.fb.control('', [Validators.required, Validators.maxLength(150)]),
    phoneNo: this.fb.control(''),
    address: this.fb.control(''),
    businessEmail: this.fb.control('', [Validators.email]),
    vetHospitalTypeId: this.fb.control('', [Validators.required]),
  });

  constructor() {
    inject(PageHeaderService).set({ title: () => 'Organizations', left: { kind: 'back' } });
    this.lookupsService.getVetHospitalTypes().subscribe((types) => this.vetHospitalTypes.set(types));
    this.runSearch();
    this.searchForm.valueChanges.pipe(debounceTime(300)).subscribe(() => this.runSearch());
  }

  vetHospitalTypeName(vetHospitalTypeId: number): string {
    return this.vetHospitalTypes().find((type) => type.id === vetHospitalTypeId)?.name ?? 'Organization';
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

  startCreating(): void {
    this.creating.set(true);
    this.createError.set(null);
    this.createForm.reset({ name: '', phoneNo: '', address: '', businessEmail: '', vetHospitalTypeId: '' });
  }

  cancelCreating(): void {
    this.creating.set(false);
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const { name, phoneNo, address, businessEmail, vetHospitalTypeId } = this.createForm.getRawValue();
    this.creatingInFlight.set(true);
    this.createError.set(null);

    this.vetHospitalsService
      .register({
        name: name!,
        vetHospitalTypeId: Number(vetHospitalTypeId),
        phoneNo: phoneNo || undefined,
        address: address || undefined,
        businessEmail: businessEmail || undefined,
      })
      .subscribe({
        next: (org) => {
          this.creatingInFlight.set(false);
          this.creating.set(false);
          this.router.navigate(['/admin/organizations', org.id]);
        },
        error: (response: HttpErrorResponse) => {
          this.creatingInFlight.set(false);
          this.createError.set(this.applyFieldErrors(response, this.createForm));
        },
      });
  }

  private runSearch(): void {
    const name = this.searchForm.getRawValue().name?.trim();
    this.loading.set(true);
    this.loadError.set(null);

    this.vetHospitalsService.search(name || undefined).subscribe({
      next: (orgs) => {
        this.organizations.set(orgs);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('Could not load organizations. Please try again.');
      },
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
