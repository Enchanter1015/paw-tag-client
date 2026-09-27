import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { OrganizationsAdmin } from './organizations-admin';
import { API_BASE_URL } from '../../core/services/api-config';
import { Lookup, VetHospital } from '../../core/models/models';

describe('OrganizationsAdmin', () => {
  const baseUrl = 'http://localhost:3000/api/v1';
  const vetHospitalTypes: Lookup[] = [{ id: 1, name: 'Clinic' }];

  const org: VetHospital = {
    id: 'org-1',
    name: 'Central Vet',
    vetHospitalTypeId: 1,
    isVerified: false,
    isArchived: false,
    createdBy: 'user-owner',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  let httpMock: HttpTestingController;

  function createComponent() {
    TestBed.configureTestingModule({
      imports: [OrganizationsAdmin],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(OrganizationsAdmin);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/vet-hospital-types`).flush(vetHospitalTypes);
    httpMock.expectOne((r) => r.url === `${baseUrl}/vet-hospitals`).flush([org]);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('loads organizations on init and re-runs the search when the name filter changes', async () => {
    const fixture = createComponent();
    expect(fixture.componentInstance.organizations()).toEqual([org]);

    fixture.componentInstance.searchForm.controls.name.setValue('Central');

    let req: ReturnType<HttpTestingController['match']>[number] | undefined;
    await vi.waitFor(() => {
      req = httpMock.match((r) => r.url === `${baseUrl}/vet-hospitals` && r.params.get('name') === 'Central')[0];
      if (!req) {
        throw new Error('debounced search request not sent yet');
      }
    });

    req!.flush([org]);
    expect(fixture.componentInstance.organizations()).toEqual([org]);
  });

  it('links each organization row to its detail page', () => {
    const fixture = createComponent();

    const link = fixture.nativeElement.querySelector('a.orgs-admin-row-btn') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/admin/organizations/org-1');
  });

  it('creates a new organization and navigates to its detail page', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.startCreating();
    component.createForm.setValue({
      name: 'New Clinic',
      phoneNo: '',
      address: '',
      businessEmail: '',
      vetHospitalTypeId: '1',
    });
    component.submitCreate();

    const req = httpMock.expectOne(`${baseUrl}/vet-hospitals`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'New Clinic', vetHospitalTypeId: 1 });
    const created = { ...org, id: 'org-2', name: 'New Clinic' };
    req.flush(created);

    expect(component.creating()).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/admin/organizations', 'org-2']);
  });

  it('maps a 400 validation error to the create form field', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.startCreating();
    component.createForm.setValue({
      name: 'Dup Clinic',
      phoneNo: '',
      address: '',
      businessEmail: '',
      vetHospitalTypeId: '1',
    });
    component.submitCreate();

    httpMock
      .expectOne(`${baseUrl}/vet-hospitals`)
      .flush(
        { error: { code: 'BAD_REQUEST', message: 'Invalid', details: [{ path: 'name', message: 'Already taken' }] } },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(component.createForm.controls.name.getError('server')).toBe('Already taken');
    expect(component.createError()).toBe('Check the highlighted fields and try again.');
  });
});
