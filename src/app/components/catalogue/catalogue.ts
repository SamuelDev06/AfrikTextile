import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  input,
  NgZone,
  OnDestroy,
  OnInit,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import type { Unsubscribe } from 'firebase/firestore';
import { CountryCatalogueService } from '../../firebase/country-catalogue.service';
import { TextileAnalyticsService } from './textile-analytics.service';
import { TextileCatalogueService } from '../../firebase/textile-catalogue.service';
import type { Country } from '../../models/country';
import type { Textile, TextileStatus } from '../../models/textile';

@Component({
  selector: 'app-catalogue',
  templateUrl: './catalogue.html',
  styleUrl: './catalogue.css',
})
export class Catalogue implements OnInit, AfterViewInit, OnDestroy {
  constructor(
    private readonly textileAnalytics: TextileAnalyticsService,
    private readonly catalogue: TextileCatalogueService,
    private readonly countryCatalogue: CountryCatalogueService,
    private readonly zone: NgZone,
  ) {}

  readonly selectedCountry = input<string | null>(null);
  readonly countrySelected = output<string | null>();
  @ViewChild('catalogueTrack') private catalogueTrack?: ElementRef<HTMLElement>;
  protected readonly searchTerm = signal('');
  protected readonly selectedTextile = signal<Textile | null>(null);
  protected readonly activeDetailImageIndex = signal(0);
  protected readonly textiles = signal<Textile[]>([]);
  protected readonly countries = signal<Country[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly dataError = signal('');
  protected readonly whatsappLink = 'https://wa.me/message/JKPDVMPZFGWSO1';
  protected readonly featuredTextiles = computed(() =>
    this.textiles().filter((textile) => textile.featured),
  );
  protected readonly detailImages = computed(() => this.selectedTextile()?.images ?? []);
  private readonly autoplayAllowed =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private autoplayInterval: number | null = null;
  private unsubscribeTextiles: Unsubscribe | null = null;
  private unsubscribeCountries: Unsubscribe | null = null;

  protected readonly filteredTextiles = computed(() => {
    const country = this.selectedCountry();
    const search = this.searchTerm().trim().toLocaleLowerCase('fr');

    return this.textiles().filter((textile) => {
      const matchesCountry = !country || textile.country === country;
      const matchesSearch =
        !search ||
        `${textile.name} ${textile.country} ${textile.description}`
          .toLocaleLowerCase('fr')
          .includes(search);

      return matchesCountry && matchesSearch;
    });
  });

  ngOnInit(): void {
    this.unsubscribeCountries = this.countryCatalogue.watchCountries(
      (countries) =>
        this.zone.run(() => {
          this.countries.set(countries);
        }),
      (error) => console.error('Impossible de charger les pays dans le catalogue.', error),
    );
    this.unsubscribeTextiles = this.catalogue.watchTextiles(
      (textiles) =>
        this.zone.run(() => {
          this.textiles.set(textiles);
          this.isLoading.set(false);
          this.dataError.set('');
        }),
      (error) =>
        this.zone.run(() => {
          console.error('Impossible de charger le catalogue public.', error);
          this.dataError.set('Le catalogue est momentanément indisponible.');
          this.isLoading.set(false);
        }),
    );
  }

  ngAfterViewInit(): void {
    this.startAutoplay();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
    this.unsubscribeTextiles?.();
    this.unsubscribeCountries?.();
  }

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.resetCarousel();
  }

  protected updateCountry(event: Event): void {
    const country = (event.target as HTMLSelectElement).value;
    this.countrySelected.emit(country || null);
    this.resetCarousel();
  }

  protected moveCarousel(track: HTMLElement, direction: -1 | 1): void {
    const firstCard = track.firstElementChild;
    if (!(firstCard instanceof HTMLElement)) {
      return;
    }

    const gap = Number.parseFloat(window.getComputedStyle(track).columnGap) || 0;
    const maxScroll = track.scrollWidth - track.clientWidth;
    if (maxScroll <= 0) {
      return;
    }

    const step = firstCard.getBoundingClientRect().width + gap;
    const nextPosition = track.scrollLeft + direction * step;
    track.scrollTo({
      left: nextPosition < 0 ? maxScroll : nextPosition > maxScroll ? 0 : nextPosition,
      behavior: 'smooth',
    });
  }

  protected pauseAutoplay(): void {
    this.stopAutoplay();
  }

  protected resumeAutoplay(): void {
    this.startAutoplay();
  }

  protected onCarouselFocusOut(event: FocusEvent, carousel: HTMLElement): void {
    const nextTarget = event.relatedTarget;
    if (!(nextTarget instanceof Node) || !carousel.contains(nextTarget)) {
      this.startAutoplay();
    }
  }

  protected statusLabel(status: TextileStatus): string {
    if (status === 'low-stock') {
      return 'Stock faible';
    }
    return status === 'out-of-stock' ? 'Rupture de stock' : 'Disponible';
  }

  protected async openWhatsapp(event: MouseEvent, textile: Textile): Promise<void> {
    const href = (event.currentTarget as HTMLAnchorElement).href;
    const opensNewTab = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

    if (event.button !== 0 || opensNewTab) {
      void this.recordWhatsappClick(textile);
      return;
    }

    event.preventDefault();
    await this.recordWhatsappClick(textile);
    window.location.assign(href);
  }

  private async recordWhatsappClick(textile: Textile): Promise<void> {
    try {
      await this.textileAnalytics.recordWhatsappClick(textile);
    } catch (error) {
      console.error('Impossible d’enregistrer le clic dans Firebase Analytics.', error);
    }
  }

  protected showDetails(textile: Textile, dialog: HTMLDialogElement): void {
    this.selectedTextile.set(textile);
    this.activeDetailImageIndex.set(0);
    dialog.showModal();
  }

  protected selectDetailImage(index: number): void {
    if (index >= 0 && index < this.detailImages().length) {
      this.activeDetailImageIndex.set(index);
    }
  }

  protected closeDetails(dialog: HTMLDialogElement): void {
    dialog.close();
  }

  protected clearSelectedTextile(): void {
    this.selectedTextile.set(null);
    this.activeDetailImageIndex.set(0);
  }

  private startAutoplay(): void {
    if (!this.autoplayAllowed || this.autoplayInterval !== null) {
      return;
    }

    this.zone.runOutsideAngular(() => {
      this.autoplayInterval = window.setInterval(() => {
        const track = this.catalogueTrack?.nativeElement;
        if (!track || track.scrollWidth <= track.clientWidth) {
          return;
        }
        this.moveCarousel(track, 1);
      }, 4500);
    });
  }

  private stopAutoplay(): void {
    if (this.autoplayInterval !== null) {
      window.clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
  }

  private resetCarousel(): void {
    if (this.catalogueTrack) {
      this.catalogueTrack.nativeElement.scrollLeft = 0;
    }
  }
}
