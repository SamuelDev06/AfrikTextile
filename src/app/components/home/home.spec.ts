import { TestBed } from '@angular/core/testing';
import { Home } from './home';
import { TextileAnalyticsService } from '../catalogue/textile-analytics.service';
import { CountryCatalogueService } from '../../firebase/country-catalogue.service';
import { TextileCatalogueService } from '../../firebase/textile-catalogue.service';
import type { Country } from '../../models/country';
import type { Textile } from '../../models/textile';

const testCountries: Country[] = [
  { id: 'mali', name: 'Mali', flag: '🇲🇱' },
  { id: 'cote-ivoire', name: "Côte d'Ivoire", flag: '🇨🇮' },
];

const testTextiles: Textile[] = [
  {
    id: 'bogolan-test',
    name: 'Bogolan de test',
    country: 'Mali',
    description: 'Un motif traditionnel',
    price: '5 000 FCFA',
    status: 'available',
    imageUrl: '/img/bogolan-test.jpg',
    imagePath: 'textiles/bogolan-test.jpg',
    images: [{ url: '/img/bogolan-test.jpg', path: 'textiles/bogolan-test.jpg' }],
    featured: true,
  },
  {
    id: 'wax-test',
    name: 'Wax de test',
    country: "Côte d'Ivoire",
    description: 'Un tissu coloré',
    price: '3 000 FCFA',
    status: 'low-stock',
    imageUrl: '/img/wax-test.jpg',
    imagePath: 'textiles/wax-test.jpg',
    images: [{ url: '/img/wax-test.jpg', path: 'textiles/wax-test.jpg' }],
    featured: false,
  },
];

describe('Home', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        {
          provide: TextileAnalyticsService,
          useValue: {
            recordWhatsappClick: async () => undefined,
          },
        },
        {
          provide: CountryCatalogueService,
          useValue: {
            watchCountries: (onChange: (countries: Country[]) => void) => {
              onChange(testCountries);
              return () => undefined;
            },
          },
        },
        {
          provide: TextileCatalogueService,
          useValue: {
            watchTextiles: (onChange: (textiles: Textile[]) => void) => {
              onChange(testTextiles);
              return () => undefined;
            },
          },
        },
      ],
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(Home);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the hero title', async () => {
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Afrik Textile');
  });

  it('should select a hero carousel slide through its indicators', async () => {
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const secondIndicator = compiled.querySelectorAll(
      '.hero-carousel__indicator',
    )[1] as HTMLButtonElement;

    secondIndicator.click();
    fixture.detectChanges();

    expect(compiled.querySelector('.hero-carousel__slide')?.getAttribute('aria-label')).toContain(
      '2 sur 3',
    );
  });

  it('should display the countries managed from the dashboard', async () => {
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.origins__countries')?.textContent).toContain('Mali');
    expect(compiled.querySelector('.catalogue__country-filter')?.textContent).toContain("Côte d'Ivoire");
  });

  it('should display the brand slogan in the hero', async () => {
    const fixture = TestBed.createComponent(Home);
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
    const fixture = TestBed.createComponent(Home);
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
    const fixture = TestBed.createComponent(Home);
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
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.engagements__title')?.textContent).toContain('Nos valeurs');
    expect(compiled.querySelectorAll('.engagements__item').length).toBe(3);
  });

  it('should display the contacts section and its social icons', async () => {
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('#contacts .contacts__logo')).toBeTruthy();
    expect(compiled.querySelectorAll('.contacts__social-icon').length).toBe(4);
  });

  it('should display the footer fabric strip and creator credit', async () => {
    const fixture = TestBed.createComponent(Home);
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
