import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Dashboard } from './dashboard';
import { API_BASE_URL } from '../core/services/api-config';
import { PageHeaderService } from '../core/services/page-header.service';
import { Animal, DashboardStats } from '../core/models/models';

describe('Dashboard', () => {
  const baseUrl = 'http://localhost:3000/api/v1';
  let httpMock: HttpTestingController;

  const recentAnimal: Animal = {
    id: 'a1111111',
    name: 'Bruno',
    animalTypeId: 1,
    isStreet: false,
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  };

  const stats: DashboardStats = {
    totalAnimals: 20,
    vaccinatedAnimals: 15,
    vaccinationDueAnimals: 3,
    recentAnimals: [recentAnimal],
  };

  function createComponent(response: DashboardStats = stats) {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/dashboard/stats`).flush(response);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('sets the page header to "Home"', () => {
    createComponent();
    const pageHeader = TestBed.inject(PageHeaderService);

    expect(pageHeader.config().title()).toBe('Home');
    expect(pageHeader.config().left).toEqual({ kind: 'none' });
  });

  it('shows a loading state before the stats arrive', () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading');
    httpMock.expectOne(`${baseUrl}/dashboard/stats`).flush(stats);
  });

  it('renders the KPI values and computed vaccination coverage', () => {
    const fixture = createComponent();

    expect(fixture.nativeElement.textContent).toContain('20');
    expect(fixture.nativeElement.textContent).toContain('15');
    expect(fixture.nativeElement.textContent).toContain('3');
    expect(fixture.nativeElement.textContent).toContain('75%');
  });

  it('shows a dash for vaccination coverage when there are no animals', () => {
    const fixture = createComponent({ totalAnimals: 0, vaccinatedAnimals: 0, vaccinationDueAnimals: 0, recentAnimals: [] });

    expect(fixture.componentInstance.vaccinationCoverage()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('—');
  });

  it('lists recently registered animals linking to their profile', () => {
    const fixture = createComponent();

    const link = fixture.nativeElement.querySelector('a.recent-animal-link') as HTMLAnchorElement;
    expect(link.textContent).toContain('Bruno');
    expect(link.getAttribute('href')).toBe('/animals/a1111111');
  });

  it('shows an empty state when no animals have been registered', () => {
    const fixture = createComponent({ ...stats, recentAnimals: [] });

    expect(fixture.nativeElement.textContent).toContain('No animals registered yet.');
  });

  it('shows an error with a retry action when loading fails, and reloads on retry', () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/dashboard/stats`).flush(
      { error: { code: 'FORBIDDEN', message: 'Missing required permission' } },
      { status: 403, statusText: 'Forbidden' }
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Could not load dashboard stats');

    const retryButton = fixture.nativeElement.querySelector('pt-button button') as HTMLButtonElement;
    retryButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading');
    httpMock.expectOne(`${baseUrl}/dashboard/stats`).flush(stats);
  });

  it('reloads the stats when the refresh action is used', () => {
    const fixture = createComponent();

    const refreshButton = Array.from(fixture.nativeElement.querySelectorAll('pt-button button')).find((b) =>
      (b as HTMLElement).textContent?.includes('Refresh')
    ) as HTMLButtonElement;
    refreshButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading');
    httpMock.expectOne(`${baseUrl}/dashboard/stats`).flush({ ...stats, totalAnimals: 21 });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('21');
  });
});
