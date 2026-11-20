import { Component, HostListener, OnDestroy, signal } from '@angular/core';
import { Catalogue } from '../catalogue/catalogue';
import { Contacts } from '../contacts/contacts';
import { Engagements } from '../engagements/engagements';
import { Footer } from '../footer/footer';
import { HeroCarousel } from '../hero-carousel/hero-carousel';
import { Origins } from '../origins/origins';

@Component({
  imports: [Origins, Catalogue, Engagements, Contacts, Footer, HeroCarousel],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home implements OnDestroy {
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
