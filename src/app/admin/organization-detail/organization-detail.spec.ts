import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { OrganizationDetail } from './organization-detail';
import { API_BASE_URL } from '../../core/services/api-config';
import { PageHeaderService } from '../../core/services/page-header.service';
import { Animal, Lookup, User, VetHospital, VetHospitalMember } from '../../core/models/models';

describe('OrganizationDetail', () => {
  const baseUrl = 'http://localhost:3000/api/v1';
  const vetHospitalTypes: Lookup[] = [{ id: 1, name: 'Clinic' }];
  const roles: Lookup[] = [{ id: 1, name: 'Vet' }, { id: 2, name: 'Assistant' }];

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

  const member: VetHospitalMember = {
    id: 'member-1',
    vetHospitalId: 'org-1',
    userId: 'user-1',
    roleId: 1,
    joinedAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const memberUser: User = {
    id: 'user-1',
    name: 'A. Fernando',
    email: 'a@example.com',
    roleId: 1,
    isActive: true,
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const animal: Animal = {
    id: 'a1111111',
    name: 'Bruno',
    animalTypeId: 1,
    isStreet: false,
    createdBy: 'user-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  let httpMock: HttpTestingController;

  function createComponent() {
    TestBed.configureTestingModule({
      imports: [OrganizationDetail],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'org-1' }) } },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(OrganizationDetail);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/vet-hospital-types`).flush(vetHospitalTypes);
    httpMock.expectOne(`${baseUrl}/roles`).flush(roles);
    httpMock.expectOne(`${baseUrl}/vet-hospitals/org-1`).flush(org);
    httpMock.expectOne(`${baseUrl}/vet-hospitals/org-1/members`).flush([member]);
    httpMock.expectOne(`${baseUrl}/vet-hospitals/org-1/animals`).flush([animal]);
    httpMock.expectOne(`${baseUrl}/users/user-1`).flush(memberUser);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('loads the organization, its members (with resolved names) and its animals', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component.organization()).toEqual(org);
    expect(component.members()).toEqual([member]);
    expect(component.memberName('user-1')).toBe('A. Fernando');
    expect(component.roleName(member.roleId)).toBe('Vet');
    expect(component.orgAnimals()).toEqual([animal]);
    expect(fixture.nativeElement.textContent).toContain('A. Fernando');

    component.activeTab.set('animals');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Bruno');
  });

  it('sets the page header title to the organization name once loaded', () => {
    createComponent();
    const pageHeader = TestBed.inject(PageHeaderService);

    expect(pageHeader.config().title()).toBe('Central Vet');
    expect(pageHeader.config().action?.kind).toBe('edit');
  });

  it('shows a not-found message for a missing organization', () => {
    TestBed.configureTestingModule({
      imports: [OrganizationDetail],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'missing' }) } },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(OrganizationDetail);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/vet-hospital-types`).flush(vetHospitalTypes);
    httpMock.expectOne(`${baseUrl}/roles`).flush(roles);
    httpMock
      .expectOne(`${baseUrl}/vet-hospitals/missing`)
      .flush({ error: { code: 'NOT_FOUND', message: 'Not found' } }, { status: 404, statusText: 'Not Found' });
    httpMock.expectOne(`${baseUrl}/vet-hospitals/missing/members`).flush([]);
    httpMock.expectOne(`${baseUrl}/vet-hospitals/missing/animals`).flush([]);
    fixture.detectChanges();

    expect(fixture.componentInstance.notFound()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Organization not found.');
  });

  it('switches between the members and animals tabs', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component.activeTab()).toBe('members');
    component.activeTab.set('animals');
    expect(component.activeTab()).toBe('animals');
  });

  it('edits and saves the organization via the top-bar save action', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const pageHeader = TestBed.inject(PageHeaderService);

    component.startEditing();
    expect(component.editForm.controls.name.value).toBe('Central Vet');
    expect(pageHeader.config().left.kind).toBe('close');
    expect(pageHeader.config().action?.kind).toBe('save');

    component.editForm.controls.isVerified.setValue(true);
    component.saveEdit();

    const req = httpMock.expectOne(`${baseUrl}/vet-hospitals/org-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      name: 'Central Vet',
      vetHospitalTypeId: 1,
      isVerified: true,
    });
    const updated = { ...org, isVerified: true };
    req.flush(updated);

    expect(component.editing()).toBe(false);
    expect(component.organization()).toEqual(updated);
    expect(pageHeader.config().left).toEqual({ kind: 'back' });
  });

  it('cancels editing without saving', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.startEditing();
    component.editForm.controls.name.setValue('Changed');
    component.cancelEditing();

    expect(component.editing()).toBe(false);
    expect(component.organization()?.name).toBe('Central Vet');
  });

  it('adds a member by email and role', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    const newUser: User = { ...memberUser, id: 'user-2', name: 'B. Perera', email: 'b@example.com' };
    component.addMemberForm.setValue({ email: 'b@example.com', roleId: '2' });
    component.addMember();

    httpMock.expectOne((r) => r.url === `${baseUrl}/users` && r.params.get('email') === 'b@example.com').flush(newUser);

    const req = httpMock.expectOne(`${baseUrl}/vet-hospitals/org-1/members`);
    expect(req.request.body).toEqual({ userId: 'user-2', roleId: 2 });
    const newMember: VetHospitalMember = { ...member, id: 'member-2', userId: 'user-2' };
    req.flush(newMember);

    expect(component.members()).toEqual([member, newMember]);
    expect(component.memberName('user-2')).toBe('B. Perera');
    expect(component.addMemberForm.controls.email.value).toBe('');
    expect(component.addingMember()).toBe(false);
  });

  it('shows an error when no user matches the given email', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.addMemberForm.setValue({ email: 'missing@example.com', roleId: '1' });
    component.addMember();

    httpMock
      .expectOne((r) => r.url === `${baseUrl}/users` && r.params.get('email') === 'missing@example.com')
      .flush(null, { status: 404, statusText: 'Not Found' });

    expect(component.addMemberError()).toContain('missing@example.com');
    expect(component.addingMember()).toBe(false);
  });

  it('shows a conflict error when the user is already a member', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.addMemberForm.setValue({ email: memberUser.email, roleId: '1' });
    component.addMember();

    httpMock
      .expectOne((r) => r.url === `${baseUrl}/users` && r.params.get('email') === memberUser.email)
      .flush(memberUser);
    httpMock
      .expectOne(`${baseUrl}/vet-hospitals/org-1/members`)
      .flush({ error: { code: 'CONFLICT', message: 'User is already a member' } }, { status: 409, statusText: 'Conflict' });

    expect(component.addMemberError()).toBe('User is already a member');
  });
});
