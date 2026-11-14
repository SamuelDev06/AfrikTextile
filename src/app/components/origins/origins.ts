import { Component } from '@angular/core';
import { CountryPill } from '../country-pill/country-pill';

interface Country {
  name: string;
  description: string;
}

@Component({
  imports: [CountryPill],
  selector: 'app-origins',
  styleUrl: './origins.css',
  templateUrl: './origins.html',
})
export class Origins {
  // stockages des  informations sur les pays 
  protected readonly countries: Country[] = [
    { name: "Côte d'Ivoire", description: 'Drapeau ivoirien' },
    { name: 'Ghana', description: 'Drapeau ghanéen' },
    { name: 'Mali', description: 'Drapeau malien' },
    { name: 'Nigeria', description: 'Drapeau nigérian' },
    { name: 'Sénégal', description: 'Drapeau sénégalais' },
    { name: 'Togo', description: 'Drapeau togolais' },
  ];
}
