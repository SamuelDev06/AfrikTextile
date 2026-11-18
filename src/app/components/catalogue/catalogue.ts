import { Component, computed, input, OnInit, output, signal } from '@angular/core';
import { TextileClicksService } from './textile-clicks.service';

type TextilePattern = 'wax' | 'bazin' | 'bogolan' | 'kente';

interface Textile {
  id: string;
  name: string;
  country: string;
  type: string;
  description: string;
  pattern: TextilePattern;
}

@Component({
  selector: 'app-catalogue',
  templateUrl: './catalogue.html',
  styleUrl: './catalogue.css',
})
export class Catalogue implements OnInit {
  constructor(private readonly textileClicks: TextileClicksService) {}

  readonly selectedCountry = input<string | null>(null);
  readonly countrySelected = output<string | null>();
  protected readonly searchTerm = signal('');
  protected readonly selectedTextile = signal<Textile | null>(null);
  protected readonly featuredTextiles = signal<Textile[]>([]);
  protected readonly featuredLoading = signal(true);
  protected readonly featuredError = signal<string | null>(null);
  protected readonly clickTrackingError = signal(false);
  // Ce lien provisoire sera remplacé par le lien WhatsApp définitif.
  protected readonly whatsappLink = '#contacts';

  // Ces tissus alimentent les cartes et les filtres du catalogue.
  protected readonly textiles: Textile[] = [
    {
      id: 'wax-royal',
      name: 'Wax Royal',
      country: "Côte d'Ivoire",
      type: 'Wax',
      description: 'Tissu traditionnel ivoirien',
      pattern: 'wax',
    },
    {
      id: 'bazin-prestige',
      name: 'Bazin Prestige',
      country: 'Sénégal',
      type: 'Bazin',
      description: 'Tissu sénégalais raffiné',
      pattern: 'bazin',
    },
    {
      id: 'bogolan-moderne',
      name: 'Bogolan Moderne',
      country: 'Mali',
      type: 'Bogolan',
      description: 'Tissu malien authentique',
      pattern: 'bogolan',
    },
    {
      id: 'kente-traditionnel',
      name: 'Kente Traditionnel',
      country: 'Ghana',
      type: 'Kente',
      description: 'Tissu ghanéen noble',
      pattern: 'kente',
    },
  ];

  protected readonly countries = [
    "Côte d'Ivoire",
    'Ghana',
    'Mali',
    'Nigeria',
    'Sénégal',
    'Togo',
  ];

  ngOnInit(): void {
    void this.loadFeaturedTextiles();
  }

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

  // Enregistre le clic et recharge le classement des 30 derniers jours.
  protected async recordWhatsappClick(textile: Textile): Promise<void> {
    try {
      await this.textileClicks.recordClick(textile.id);
      this.clickTrackingError.set(false);
      await this.loadFeaturedTextiles();
    } catch (error) {
      console.error('Impossible d’enregistrer le clic WhatsApp.', error);
      this.clickTrackingError.set(true);
    }
  }

  private async loadFeaturedTextiles(): Promise<void> {
    this.featuredLoading.set(true);
    this.featuredError.set(null);

    try {
      const topIds = await this.textileClicks.getTopTextileIds();
      this.featuredTextiles.set(
        topIds
          .map((id) => this.textiles.find((textile) => textile.id === id))
          .filter((textile): textile is Textile => textile !== undefined),
      );
    } catch (error) {
      console.error('Impossible de charger la sélection du moment.', error);
      this.featuredError.set('La sélection du moment est temporairement indisponible.');
    } finally {
      this.featuredLoading.set(false);
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
