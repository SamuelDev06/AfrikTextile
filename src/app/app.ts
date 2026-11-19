import { Component, HostListener, OnDestroy, signal } from '@angular/core';
import { Catalogue } from './components/catalogue/catalogue';
import { Contacts } from './components/contacts/contacts';
import { Engagements } from './components/engagements/engagements';
import { Footer } from './components/footer/footer';
import { HeroCarousel } from './components/hero-carousel/hero-carousel';
import { Origins } from './components/origins/origins';

@Component({
  imports: [Origins, Catalogue, Engagements, Contacts, Footer, HeroCarousel],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnDestroy {
  protected readonly title = signal('AfrikTextile');
  protected readonly isMenuOpen = signal(false);
  protected readonly isLoading = signal(true);
  protected readonly showBackToTop = signal(false);
  // Ce pays est partagé entre les origines et le catalogue.
  protected readonly selectedCountry = signal<string | null>(null);

  private readonly loadingFallback = window.setTimeout(() => this.isLoading.set(false), 1200);

  ngOnDestroy(): void {
    window.clearTimeout(this.loadingFallback);
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  protected updateBackToTopVisibility(): void {
    const footer = document.getElementById('page-footer');
    this.showBackToTop.set(
      footer !== null && footer.getBoundingClientRect().top < window.innerHeight,
    );
  }

  protected finishLoading(event: AnimationEvent): void {
    if (event.target === event.currentTarget) {
      window.clearTimeout(this.loadingFallback);
      this.isLoading.set(false);
    }
  }

  protected scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  protected toggleMenu(): void {
    this.isMenuOpen.update((isOpen) => !isOpen);
  }

  protected closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  protected selectCountry(country: string | null): void {
    this.selectedCountry.set(country);
  }
}
