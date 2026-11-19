import { Component, computed, input, output, signal } from '@angular/core';
import { TextileAnalyticsService } from './textile-analytics.service';

type TextilePattern = 'wax' | 'bazin' | 'bogolan' | 'kente';

interface Textile {
  id: string;
  name: string;
  country: string;
  type: string;
  description: string;
  pattern: TextilePattern;
  featured: boolean;
}

@Component({
  selector: 'app-catalogue',
  templateUrl: './catalogue.html',
  styleUrl: './catalogue.css',
})
export class Catalogue {
  constructor(private readonly textileAnalytics: TextileAnalyticsService) {}

  readonly selectedCountry = input<string | null>(null);
  readonly countrySelected = output<string | null>();
  protected readonly searchTerm = signal('');
  protected readonly selectedTextile = signal<Textile | null>(null);
  protected readonly whatsappLink = 'https://wa.me/message/JKPDVMPZFGWSO1';

  // Ces tissus alimentent les cartes et les filtres du catalogue.
  protected readonly textiles: Textile[] = [
    {
      id: 'wax-royal',
      name: 'Wax Royal',
      country: "Côte d'Ivoire",
      type: 'Wax',
      description: 'Tissu traditionnel ivoirien',
      pattern: 'wax',
      featured: true,
    },
    {
      id: 'bazin-prestige',
      name: 'Bazin Prestige',
      country: 'Sénégal',
      type: 'Bazin',
      description: 'Tissu sénégalais raffiné',
      pattern: 'bazin',
      featured: true,
    },
    {
      id: 'bogolan-moderne',
      name: 'Bogolan Moderne',
      country: 'Mali',
      type: 'Bogolan',
      description: 'Tissu malien authentique',
      pattern: 'bogolan',
      featured: false,
    },
    {
      id: 'kente-traditionnel',
      name: 'Kente Traditionnel',
      country: 'Ghana',
      type: 'Kente',
      description: 'Tissu ghanéen noble',
      pattern: 'kente',
      featured: true,
    },
  ];

  // Cette sélection reste manuelle ; Analytics aide à voir les préférences.
  protected readonly featuredTextiles = this.textiles.filter((textile) => textile.featured);

  protected readonly countries = [
    "Côte d'Ivoire",
    'Ghana',
    'Mali',
    'Nigeria',
    'Sénégal',
    'Togo',
  ];

  // Le pays choisi et la recherche déterminent les tissus affichés.
  protected readonly filteredTextiles = computed(() => {
    const country = this.selectedCountry();
    const search = this.searchTerm().trim().toLocaleLowerCase('fr');

    return this.textiles.filter((textile) => {
      const matchesCountry = !country || textile.country === country;
      const matchesSearch =
        !search ||
        `${textile.name} ${textile.country} ${textile.type}`
          .toLocaleLowerCase('fr')
          .includes(search);

      return matchesCountry && matchesSearch;
    });
  });

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected updateCountry(event: Event): void {
    const country = (event.target as HTMLSelectElement).value;
    this.countrySelected.emit(country || null);
  }

  protected moveCarousel(track: HTMLElement, direction: -1 | 1): void {
    const firstCard = track.firstElementChild;
    if (!(firstCard instanceof HTMLElement)) {
      return;
    }

    const gap = Number.parseFloat(window.getComputedStyle(track).columnGap) || 0;
    track.scrollBy({
      left: direction * (firstCard.getBoundingClientRect().width + gap),
      behavior: 'auto',
    });
  }

  // Enregistre le clic avant d’ouvrir WhatsApp.
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
    dialog.showModal();
  }

  protected closeDetails(dialog: HTMLDialogElement): void {
    dialog.close();
  }

  protected clearSelectedTextile(): void {
    this.selectedTextile.set(null);
  }
}
