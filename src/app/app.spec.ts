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

  it('should advance the hero carousel to the next slide', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const nextButton = compiled.querySelector(
      '.hero-carousel__control--next',
    ) as HTMLButtonElement;

    nextButton.click();
    fixture.detectChanges();

    expect(compiled.querySelector('.hero-carousel__slide')?.getAttribute('aria-label')).toContain(
      '2 sur 3',
    );
  });

  it('should display the brand slogan in the hero', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.brand__slogan')?.textContent).toContain(
      'L’authenticité africaine, notre fierté.',
    );
    expect(compiled.querySelector('.hero__tagline')?.textContent).toContain(
      'L’authenticité africaine, notre fierté.',
    );
  });

  it('should center a single search result and hide catalogue arrows', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const search = compiled.querySelector('.catalogue__search input') as HTMLInputElement;

    search.value = 'Bogolan';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    expect(compiled.querySelector('.catalogue__grid--single')).toBeTruthy();
    expect(compiled.querySelectorAll('.catalogue__carousel .catalogue__carousel-button').length).toBe(0);
  });

  it('should toggle the mobile navigation menu', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const toggle = compiled.querySelector('.menu-toggle') as HTMLButtonElement;

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(compiled.querySelector('.site-navigation')?.classList.contains('site-navigation--open')).toBe(true);
    expect(compiled.querySelector('.site-navigation__slogan')?.textContent).toContain(
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
    expect(compiled.querySelector('.site-footer__portfolio')?.getAttribute('href')).toBe(
      'https://mon-premier-portfolio.vercel.app/',
    );
  });
});
