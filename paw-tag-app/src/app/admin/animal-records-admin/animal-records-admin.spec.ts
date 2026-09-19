import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AnimalRecordsAdmin } from './animal-records-admin';
import { API_BASE_URL } from '../../core/services/api-config';
import { Animal, Lookup } from '../../core/models/models';

describe('AnimalRecordsAdmin', () => {
  const baseUrl = 'http://localhost:3000/api/v1';
  const animalTypes: Lookup[] = [{ id: 1, name: 'Dog' }];
  const animals: Animal[] = [
    { id: 'a1111111', name: 'Rex', animalTypeId: 1, isStreet: false, createdAt: '', updatedAt: '' },
    { id: 'a2222222', name: 'Milo', animalTypeId: 1, isStreet: true, createdAt: '', updatedAt: '' },
  ];

  let httpMock: HttpTestingController;

  function createComponent() {
    TestBed.configureTestingModule({
      imports: [AnimalRecordsAdmin],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AnimalRecordsAdmin);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/animal-types`).flush(animalTypes);
    httpMock.expectOne((r) => r.url === `${baseUrl}/animals`).flush(animals);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('loads and lists animals, then re-runs the search when a filter changes', async () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    expect(component.animals()).toEqual(animals);

    component.filterForm.controls.isStreet.setValue(true);

    let req: ReturnType<HttpTestingController['match']>[number] | undefined;
    await vi.waitFor(() => {
      req = httpMock.match((r) => r.url === `${baseUrl}/animals`)[0];
      if (!req) {
        throw new Error('debounced search request not sent yet');
      }
    });

    expect(req!.request.params.get('isStreet')).toBe('true');
    req!.flush([animals[1]]);

    expect(component.animals()).toEqual([animals[1]]);
  });

  it('requires confirmation before removing an animal, and removes it on confirm', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.requestRemove(animals[0]);
    expect(component.pendingAction()).toEqual({ type: 'remove', animal: animals[0] });

    component.confirmPendingAction();

    const req = httpMock.expectOne(`${baseUrl}/animals/${animals[0].id}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    expect(component.pendingAction()).toBeNull();
    expect(component.animals()).toEqual([animals[1]]);
  });

  it('does not remove anything when the confirmation is cancelled', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.requestRemove(animals[0]);
    component.cancelPendingAction();

    expect(component.pendingAction()).toBeNull();
    expect(component.animals()).toEqual(animals);
  });

  it('requires a target ID and confirmation before merging, then merges on confirm', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.toggleMerge(animals[0]);
    expect(component.mergingId()).toBe(animals[0].id);

    // No target entered yet: should show a validation error, not open the dialog.
    component.confirmMergeTarget(animals[0]);
    expect(component.mergeTargetError()).toBeTruthy();
    expect(component.pendingAction()).toBeNull();

    component.mergeTargetId.setValue(animals[1].id);
    component.confirmMergeTarget(animals[0]);
    expect(component.pendingAction()).toEqual({ type: 'merge', animal: animals[0], targetId: animals[1].id });

    component.confirmPendingAction();

    const req = httpMock.expectOne(`${baseUrl}/animals/${animals[0].id}/merge`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ targetId: animals[1].id });
    req.flush(animals[0]);

    expect(component.pendingAction()).toBeNull();
    expect(component.mergingId()).toBeNull();
    expect(component.animals()).toEqual([animals[1]]);
  });

  it('does not merge anything when the confirmation is cancelled', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.toggleMerge(animals[0]);
    component.mergeTargetId.setValue(animals[1].id);
    component.confirmMergeTarget(animals[0]);
    component.cancelPendingAction();

    expect(component.pendingAction()).toBeNull();
    expect(component.animals()).toEqual(animals);
  });
});
