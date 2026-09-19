import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AnimalRegister } from './animal-register';
import { API_BASE_URL } from '../../core/services/api-config';
import { AuthStateService } from '../../core/services/auth-state.service';
import { PageHeaderService } from '../../core/services/page-header.service';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { Animal, Lookup } from '../../core/models/models';

function makeToken(role: string): string {
  const encode = (obj: object) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const payload = { sub: 'user-1', role, exp: Math.floor(Date.now() / 1000) + 3600 };
  return `${encode({ alg: 'none' })}.${encode(payload)}.signature`;
}

describe('AnimalRegister', () => {
  const baseUrl = 'http://localhost:3000/api/v1';
  const animalTypes: Lookup[] = [
    { id: 1, name: 'Dog' },
    { id: 2, name: 'Cat' },
  ];
  let httpMock: HttpTestingController;
  let router: Router;

  function createComponent() {
    const fixture = TestBed.createComponent(AnimalRegister);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/animal-types`).flush(animalTypes);
    return fixture;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AnimalRegister],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('sets the page header title with a back chevron and no admin tag for a non-admin', () => {
    createComponent();
    const pageHeader = TestBed.inject(PageHeaderService);

    expect(pageHeader.config().title()).toBe('Add animal');
    expect(pageHeader.config().left).toEqual({ kind: 'back' });
    expect(pageHeader.config().action).toBeUndefined();
  });

  it('shows an "Admin" tag in the header for an administrator', () => {
    const tokenStorage = TestBed.inject(TokenStorageService);
    const authState = TestBed.inject(AuthStateService);
    tokenStorage.setTokens(makeToken('Administrator'), 'refresh-1');
    authState.refresh();

    createComponent();
    const pageHeader = TestBed.inject(PageHeaderService);

    expect(pageHeader.config().action).toEqual({ kind: 'tag', label: 'Admin' });
  });

  async function waitForSearchRequest() {
    let request: ReturnType<HttpTestingController['match']>[number] | undefined;
    await vi.waitFor(() => {
      request = httpMock.match((req) => req.url === `${baseUrl}/animals` && req.params.has('query'))[0];
      if (!request) {
        throw new Error('search request not made yet');
      }
    });
    return request!;
  }

  it('loads animal types on init', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance.animalTypes()).toEqual(animalTypes);
  });

  it('does not submit and shows validation errors when required fields are missing', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.submit();

    expect(component.form.invalid).toBe(true);
    expect(component.nameError()).toBe("Enter the animal's name.");
    expect(component.animalTypeError()).toBe('Select an animal type.');
  });

  it('registers an animal and navigates away on success', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');

    component.form.setValue({ name: 'Rex', dob: '', animalTypeId: '1', breed: '', isStreet: false });
    component.submit();

    const req = httpMock.expectOne(`${baseUrl}/animals`);
    expect(req.request.body).toEqual({ name: 'Rex', animalTypeId: 1, isStreet: false });

    const created: Animal = {
      id: 'a1',
      name: 'Rex',
      animalTypeId: 1,
      isStreet: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    req.flush(created);

    expect(component.submitting()).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith('/');
  });

  it('shows a photo preview after a file is selected', async () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    const file = new File(['fake-image-bytes'], 'dog.png', { type: 'image/png' });
    const input = document.createElement('input');
    input.type = 'file';
    Object.defineProperty(input, 'files', { value: [file] });

    component.onPhotoSelected({ target: input } as unknown as Event);

    await vi.waitFor(() => expect(component.photoPreview()).toMatch(/^data:/));
  });

  it('maps a 400 validation error to inline field errors', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.form.setValue({ name: 'Rex', dob: '', animalTypeId: '1', breed: '', isStreet: false });
    component.submit();

    const req = httpMock.expectOne(`${baseUrl}/animals`);
    req.flush(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: [{ path: 'body.name', message: 'Name is required' }],
        },
      },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(component.submitting()).toBe(false);
    expect(component.nameError()).toBe('Name is required');
  });

  it('auto-generates a unique name when marked as a street animal with no name entered', async () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.form.controls.isStreet.setValue(true);

    const searchReq = await waitForSearchRequest();
    searchReq.flush([]);

    await vi.waitFor(() => expect(component.generatingName()).toBe(false));

    expect(component.name.value).toBeTruthy();
    expect(component.name.value).toMatch(/^[A-Za-z]+ [A-Za-z]+$/);
  });

  it('retries generation when the candidate name is already taken', async () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.form.controls.isStreet.setValue(true);

    const firstReq = await waitForSearchRequest();
    const takenName = firstReq.request.params.get('query')!;
    firstReq.flush([{ id: 'a1', name: takenName, animalTypeId: 1, isStreet: true, createdAt: '', updatedAt: '' }]);

    const secondReq = await waitForSearchRequest();
    secondReq.flush([]);

    await vi.waitFor(() => expect(component.generatingName()).toBe(false));
    expect(component.name.value).toBeTruthy();
  });

  it('does not overwrite a name the user already typed when marking street animal', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.name.setValue('Rex');
    component.form.controls.isStreet.setValue(true);

    httpMock.expectNone((req) => req.url === `${baseUrl}/animals` && req.params.has('query'));
    expect(component.name.value).toBe('Rex');
  });
});
