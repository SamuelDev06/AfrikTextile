import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

type TextileStatus = 'available' | 'low-stock' | 'out-of-stock';

interface Textile {
  id: string;
  name: string;
  country: string;
  description: string;
  price: string;
  status: TextileStatus;
  pattern: 'wax' | 'bazin' | 'bogolan' | 'kente';
}

interface Country {
  name: string;
  flag: string;
}

@Component({
  imports: [RouterLink],
  selector: 'app-dashboard',
  styleUrl: './dashboard.css',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  protected readonly sidebarOpen = signal(false);
  protected readonly searchTerm = signal('');
  protected readonly selectedCountry = signal('');
  protected readonly selectedStatus = signal('');

  protected readonly countries: Country[] = [
    { name: "Côte d'Ivoire", flag: '🇨🇮' },
    { name: 'Sénégal', flag: '🇸🇳' },
    { name: 'Mali', flag: '🇲🇱' },
    { name: 'Ghana', flag: '🇬🇭' },
    { name: 'Nigeria', flag: '🇳🇬' },
    { name: 'Togo', flag: '🇹🇬' },
  ];

  protected readonly textiles: Textile[] = [
    {
      id: 'wax-royal',
      name: 'Wax Royal',
      country: "Côte d'Ivoire",
      description: 'Tissu traditionnel ivoirien',
      price: 'À renseigner',
      status: 'available',
      pattern: 'wax',
    },
    {
      id: 'bazin-prestige',
      name: 'Bazin Prestige',
      country: 'Sénégal',
      description: 'Tissu sénégalais raffiné',
      price: 'À renseigner',
      status: 'low-stock',
      pattern: 'bazin',
    },
    {
      id: 'bogolan-moderne',
      name: 'Bogolan Moderne',
      country: 'Mali',
      description: 'Tissu malien authentique',
      price: 'À renseigner',
      status: 'out-of-stock',
      pattern: 'bogolan',
    },
    {
      id: 'kente-traditionnel',
      name: 'Kente Traditionnel',
      country: 'Ghana',
      description: 'Tissu ghanéen noble',
      price: 'À renseigner',
      status: 'available',
      pattern: 'kente',
    },
  ];

  protected readonly stats = computed(() => ({
    total: this.textiles.length,
    countries: new Set(this.textiles.map((textile) => textile.country)).size,
    available: this.textiles.filter((textile) => textile.status === 'available').length,
    outOfStock: this.textiles.filter((textile) => textile.status === 'out-of-stock').length,
  }));

  protected readonly filteredTextiles = computed(() => {
    const search = this.searchTerm().trim().toLocaleLowerCase('fr');
    const country = this.selectedCountry();
    const status = this.selectedStatus();

    return this.textiles.filter((textile) => {
      const matchesSearch =
        !search ||
        `${textile.name} ${textile.country} ${textile.description}`
          .toLocaleLowerCase('fr')
          .includes(search);

      return (
        matchesSearch &&
        (!country || textile.country === country) &&
        (!status || textile.status === status)
      );
    });
  });

  protected readonly countryCounts = computed(() =>
    this.countries.map((country) => ({
      ...country,
      count: this.textiles.filter((textile) => textile.country === country.name).length,
    })),
  );

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected updateCountry(event: Event): void {
    this.selectedCountry.set((event.target as HTMLSelectElement).value);
  }

  protected updateStatus(event: Event): void {
    this.selectedStatus.set((event.target as HTMLSelectElement).value);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }
}
