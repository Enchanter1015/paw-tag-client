import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';
import { Home } from './home';

@Component({ template: '', standalone: true })
class DummyComponent {}

describe('Home', () => {
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([
          { path: '', component: Home },
          { path: 'login', component: DummyComponent },
          { path: 'scan', component: DummyComponent },
        ]),
      ],
    });
    router = TestBed.inject(Router);
  });

  it('creates the home component', () => {
    const fixture = TestBed.createComponent(Home);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('renders clear, plain-English product explanation in the hero', () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const heroTitle = el.querySelector('.pt-home-hero-title');
    expect(heroTitle?.textContent).toContain('QR collar tracking for street dogs across Sri Lanka');

    const heroDesc = el.querySelector('.pt-home-hero-desc');
    expect(heroDesc?.textContent).toContain('tracking street dog vaccination, sterilisation, and medical treatment');

    const heroSubdesc = el.querySelector('.pt-home-hero-subdesc');
    expect(heroSubdesc?.textContent).toContain('veterinarians, animal-welfare field workers, community members, and pet owners');
  });

  it('includes exactly two CTAs in the hero section', () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const heroActions = el.querySelector('.pt-home-hero-actions');
    const heroButtons = heroActions?.querySelectorAll('pt-button');
    expect(heroButtons?.length).toBe(2);
  });

  it('navigates to /login when clicking the Log in CTA in the hero', async () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const heroActions = el.querySelector('.pt-home-hero-actions');
    const loginButton = Array.from(heroActions?.querySelectorAll('pt-button') ?? []).find((b) =>
      b.textContent?.includes('Log in'),
    );
    expect(loginButton).toBeTruthy();

    loginButton?.querySelector('button')?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(router.url).toBe('/login');
  });

  it('navigates to /scan when clicking the Scan a collar CTA in the hero', async () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const heroActions = el.querySelector('.pt-home-hero-actions');
    const scanButton = Array.from(heroActions?.querySelectorAll('pt-button') ?? []).find((b) =>
      b.textContent?.includes('Scan a collar'),
    );
    expect(scanButton).toBeTruthy();

    scanButton?.querySelector('button')?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(router.url).toBe('/scan');
  });

  it('renders supporting sections for how it works and who it is for', () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const sectionTitles = Array.from(el.querySelectorAll('.pt-home-section-title')).map(
      (t) => t.textContent?.trim(),
    );
    expect(sectionTitles).toContain('How it works');
    expect(sectionTitles).toContain("Who it's for");
  });
});
