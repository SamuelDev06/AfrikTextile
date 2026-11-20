import { Component, input, NgZone, OnDestroy, OnInit, output, signal } from '@angular/core';
import type { Unsubscribe } from 'firebase/firestore';
import { CountryCatalogueService } from '../../firebase/country-catalogue.service';
import type { Country } from '../../models/country';
import { CountryPill } from '../country-pill/country-pill';

@Component({
  imports: [CountryPill],
  selector: 'app-origins',
  styleUrl: './origins.css',
  templateUrl: './origins.html',
})
export class Origins implements OnInit, OnDestroy {
  constructor(
    private readonly countryCatalogue: CountryCatalogueService,
    private readonly zone: NgZone,
  ) {}

  readonly selectedCountry = input<string | null>(null);
  readonly countrySelected = output<string | null>();
  protected readonly countries = signal<Country[]>([]);
  protected readonly countryError = signal('');
  private unsubscribeCountries: Unsubscribe | null = null;

  ngOnInit(): void {
    this.unsubscribeCountries = this.countryCatalogue.watchCountries(
      (countries) =>
        this.zone.run(() => {
          this.countries.set(countries);
          this.countryError.set('');
        }),
      (error) =>
        this.zone.run(() => {
          console.error('Impossible de charger les pays sur la vitrine.', error);
          this.countryError.set('Les pays ne sont momentanément pas disponibles.');
        }),
    );
  }

  ngOnDestroy(): void {
    this.unsubscribeCountries?.();
  }
}
