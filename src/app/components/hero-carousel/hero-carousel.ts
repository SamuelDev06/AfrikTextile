import { Component, ElementRef, NgZone, OnDestroy, OnInit, signal } from '@angular/core';

type HeroPattern = 'wax' | 'bazin' | 'bogolan';

interface HeroSlide {
  id: string;
  title: string;
  description: string;
  pattern: HeroPattern;
  image: string | null;
}

@Component({
  selector: 'app-hero-carousel',
  templateUrl: './hero-carousel.html',
  styleUrl: './hero-carousel.css',
})
export class HeroCarousel implements OnInit, OnDestroy {
  protected readonly slides: HeroSlide[] = [
    {
      id: 'wax',
      title: 'Wax coloré',
      description: 'Motifs et couleurs éclatants du wax africain.',
      pattern: 'wax',
      image: null,
    },
    {
      id: 'bazin',
      title: 'Bazin brodé',
      description: 'Élégance et finesse du bazin brodé.',
      pattern: 'bazin',
      image: null,
    },
    {
      id: 'bogolan',
      title: 'Bogolan traditionnel',
      description: 'Motifs authentiques du bogolan malien.',
      pattern: 'bogolan',
      image: null,
    },
  ];

  protected readonly activeSlide = signal(0);
  protected readonly autoplayAllowed =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  private intervalId: number | null = null;

  constructor(
    private readonly zone: NgZone,
    private readonly host: ElementRef<HTMLElement>,
  ) {}

  ngOnInit(): void {
    this.startAutoplay();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  private nextSlide(): void {
    this.activeSlide.update((index) => (index + 1) % this.slides.length);
  }

  protected selectSlide(index: number): void {
    this.activeSlide.set(index);
  }

  protected pauseAutoplay(): void {
    this.stopAutoplay();
  }

  protected resumeAutoplay(): void {
    this.startAutoplay();
  }

  protected onFocusOut(event: FocusEvent): void {
    const nextTarget = event.relatedTarget;
    if (!(nextTarget instanceof Node) || !this.host.nativeElement.contains(nextTarget)) {
      this.startAutoplay();
    }
  }

  private startAutoplay(): void {
    if (!this.autoplayAllowed || this.intervalId !== null) {
      return;
    }

    this.zone.runOutsideAngular(() => {
      this.intervalId = window.setInterval(() => {
        this.zone.run(() => this.nextSlide());
      }, 5000);
    });
  }

  private stopAutoplay(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
