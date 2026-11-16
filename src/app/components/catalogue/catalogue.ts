import { Component, computed, input, output, signal } from '@angular/core';

type TextilePattern = 'wax' | 'bazin' | 'bogolan' | 'kente';

interface Textile {
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
export class Catalogue {
  readonly selectedCountry = input<string | null>(null);
  readonly countrySelected = output<string | null>();
  protected readonly searchTerm = signal('');
  protected readonly selectedTextile = signal<Textile | null>(null);
  // Ce lien provisoire sera remplacé par le lien WhatsApp définitif.
  protected readonly whatsappLink = '#contacts';

  // Ces tissus alimentent les cartes et les filtres du catalogue.
  protected readonly textiles: Textile[] = [
    {
      name: 'Wax Royal',
      country: "Côte d'Ivoire",
      type: 'Wax',
      description: 'Tissu traditionnel ivoirien',
      pattern: 'wax',
    },
    {
      name: 'Bazin Prestige',
      country: 'Sénégal',
      type: 'Bazin',
      description: 'Tissu sénégalais raffiné',
      pattern: 'bazin',
    },
    {
      name: 'Bogolan Moderne',
      country: 'Mali',
      type: 'Bogolan',
      description: 'Tissu malien authentique',
      pattern: 'bogolan',
    },
    {
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
