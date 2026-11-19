import { Component, signal } from '@angular/core';
import { Catalogue } from './components/catalogue/catalogue';
import { Engagements } from './components/engagements/engagements';
import { Origins } from './components/origins/origins';

@Component({
  imports: [Origins, Catalogue, Engagements],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('AfrikTextile');
  // Ce pays est partagé entre les origines et le catalogue.
  protected readonly selectedCountry = signal<string | null>(null);

  protected selectCountry(country: string | null): void {
    this.selectedCountry.set(country);
  }
}
