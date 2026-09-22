import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { UserManagement } from './user-management';
import { API_BASE_URL } from '../../core/services/api-config';
import { Lookup, User } from '../../core/models/models';

describe('UserManagement', () => {
  const baseUrl = 'http://localhost:3000/api/v1';
  const user: User = {
    id: 'u1111111',
    name: 'Jane Doe',
    email: 'jane@example.com',
    phoneNo: '0771234567',
    address: '12 Lotus Lane',
    roleId: 1,
    isActive: true,
    updatedAt: '2026-01-01T00:00:00Z',
  };
  const roles: Lookup[] = [
    { id: 1, name: 'Pet owner' },
    { id: 2, name: 'Vet' },
    { id: 3, name: 'Administrator' },
  ];

  let httpMock: HttpTestingController;

  function createComponent() {
    TestBed.configureTestingModule({
      imports: [UserManagement],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: baseUrl }],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(UserManagement);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/roles`).flush(roles);
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('finds a user by email and displays their details', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.searchForm.setValue({ email: user.email });
    component.search();

    const req = httpMock.expectOne((r) => r.url === `${baseUrl}/users` && r.params.get('email') === user.email);
    req.flush(user);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Jane Doe');
    expect(fixture.nativeElement.textContent).toContain('jane@example.com');
  });

  it('shows a retryable error when no user matches the entered email', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.searchForm.setValue({ email: 'nobody@example.com' });
    component.search();

    const req = httpMock.expectOne((r) => r.url === `${baseUrl}/users`);
    req.flush({ error: { code: 'NOT_FOUND', message: 'User not found' } }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(component.searchError()).toContain('nobody@example.com');
  });

  it('does not search while the email field is invalid', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.searchForm.setValue({ email: 'not-an-email' });
    component.search();

    httpMock.expectNone((r) => r.url === `${baseUrl}/users`);
    expect(component.email.touched).toBe(true);
  });

  it('edits and saves a found user profile', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.searchForm.setValue({ email: user.email });
    component.search();
    httpMock.expectOne((r) => r.url === `${baseUrl}/users`).flush(user);
    fixture.detectChanges();

    component.startEditing();
    fixture.detectChanges();
    expect(component.editing()).toBe(true);
    expect(component.editForm.controls.name.value).toBe('Jane Doe');

    component.editForm.controls.name.setValue('Jane Updated');
    component.save();

    const req = httpMock.expectOne(`${baseUrl}/users/${user.id}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      name: 'Jane Updated',
      email: user.email,
      phoneNo: user.phoneNo,
      address: user.address,
    });

    req.flush({ ...user, name: 'Jane Updated' });

    expect(component.saving()).toBe(false);
    expect(component.editing()).toBe(false);
    expect(component.user()?.name).toBe('Jane Updated');
  });

  it('maps a 400 validation error to the relevant form field', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.searchForm.setValue({ email: user.email });
    component.search();
    httpMock.expectOne((r) => r.url === `${baseUrl}/users`).flush(user);
    fixture.detectChanges();

    component.startEditing();
    component.save();

    const req = httpMock.expectOne(`${baseUrl}/users/${user.id}`);
    req.flush(
      { error: { code: 'VALIDATION', message: 'Invalid input', details: [{ path: 'body.email', message: 'Email already in use' }] } },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(component.editEmailError()).toBe('Email already in use');
    expect(component.formError()).toBe('Check the highlighted fields and try again.');
  });

  it('changes a user role after confirmation', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.searchForm.setValue({ email: user.email });
    component.search();
    httpMock.expectOne((r) => r.url === `${baseUrl}/users`).flush(user);
    fixture.detectChanges();

    component.selectedRoleId.set(2);
    component.requestRoleChange();
    expect(component.pendingAction()).toEqual({ type: 'role', roleId: 2 });

    component.confirmPendingAction();

    const req = httpMock.expectOne(`${baseUrl}/users/${user.id}/role`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ roleId: 2 });
    req.flush({ ...user, roleId: 2 });

    expect(component.pendingAction()).toBeNull();
    expect(component.user()?.roleId).toBe(2);
  });

  it('deactivates a user after confirmation', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.searchForm.setValue({ email: user.email });
    component.search();
    httpMock.expectOne((r) => r.url === `${baseUrl}/users`).flush(user);
    fixture.detectChanges();

    component.requestDeactivate();
    component.confirmPendingAction();

    const req = httpMock.expectOne(`${baseUrl}/users/${user.id}/deactivate`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...user, isActive: false });

    expect(component.user()?.isActive).toBe(false);
  });

  it('reactivates a deactivated user after confirmation', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.searchForm.setValue({ email: user.email });
    component.search();
    httpMock.expectOne((r) => r.url === `${baseUrl}/users`).flush({ ...user, isActive: false });
    fixture.detectChanges();

    component.requestActivate();
    component.confirmPendingAction();

    const req = httpMock.expectOne(`${baseUrl}/users/${user.id}/activate`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...user, isActive: true });

    expect(component.user()?.isActive).toBe(true);
  });

  it('surfaces an error when a role change or deactivation fails', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.searchForm.setValue({ email: user.email });
    component.search();
    httpMock.expectOne((r) => r.url === `${baseUrl}/users`).flush(user);
    fixture.detectChanges();

    component.requestDeactivate();
    component.confirmPendingAction();

    const req = httpMock.expectOne(`${baseUrl}/users/${user.id}/deactivate`);
    req.flush({ error: { code: 'FORBIDDEN', message: 'Missing permission' } }, { status: 403, statusText: 'Forbidden' });

    expect(component.roleActionError()).toBe('Missing permission');
    expect(component.pendingAction()).toBeNull();
  });
});
