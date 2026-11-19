import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { TextileAnalyticsService } from './components/catalogue/textile-analytics.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: TextileAnalyticsService,
          useValue: {
            recordWhatsappClick: async () => undefined,
          },
        },
      ],
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the hero title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Afrik Textile');
  });

  it('should display the brand slogan in the hero', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.hero__tagline')?.textContent).toContain(
      'L’authenticité africaine, notre fierté.',
    );
  });

  it('should display the values banner', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.engagements__title')?.textContent).toContain('Nos valeurs');
    expect(compiled.querySelectorAll('.engagements__item').length).toBe(3);
  });

  it('should display the contacts section and its social icons', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('#contacts .contacts__logo')).toBeTruthy();
    expect(compiled.querySelectorAll('.contacts__social-icon').length).toBe(4);
  });

  it('should display the footer fabric strip and creator credit', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.site-footer__fabric')).toBeTruthy();
    expect(compiled.querySelector('.site-footer__copyright')?.textContent).toContain(
      'Afrik Textile. Tous droits réservés.',
    );
    expect(compiled.querySelector('.site-footer__author')?.textContent).toContain('Dev713');
    expect(compiled.querySelector('.site-footer__swirl')?.textContent).toContain('🌀');
  });
});
