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
      image: '/img/hero1.jpg',
    },
    {
      id: 'bazin',
      title: 'Bazin brodé',
      description: 'Élégance et finesse du bazin brodé.',
      pattern: 'bazin',
      image: '/img/hero2.jpg',
    },
    {
      id: 'bogolan',
      title: 'Bogolan traditionnel',
      description: 'Motifs authentiques du bogolan malien.',
      pattern: 'bogolan',
      image: '/img/hero3.jpg',
    },
  ];

  protected readonly activeSlide = signal(0);
  protected readonly previousSlide = signal<number | null>(null);
  protected readonly enteringSlide = signal<number | null>(null);
  protected readonly autoplayAllowed =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  private intervalId: number | null = null;
  private transitionTimeout: number | null = null;
  private transitionFrame: number | null = null;

  constructor(
    private readonly zone: NgZone,
    private readonly host: ElementRef<HTMLElement>,
  ) {}

  ngOnInit(): void {
    this.startAutoplay();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
    if (this.transitionTimeout !== null) {
      window.clearTimeout(this.transitionTimeout);
    }
    if (this.transitionFrame !== null) {
      window.cancelAnimationFrame(this.transitionFrame);
    }
  }

  private nextSlide(): void {
    this.showSlide((this.activeSlide() + 1) % this.slides.length);
  }

  protected selectSlide(index: number): void {
    this.showSlide(index);
  }

  private showSlide(index: number): void {
    if (index === this.activeSlide()) return;

    this.previousSlide.set(this.activeSlide());
    this.activeSlide.set(index);
    this.enteringSlide.set(index);

    if (this.transitionFrame !== null) {
      window.cancelAnimationFrame(this.transitionFrame);
    }
    this.transitionFrame = window.requestAnimationFrame(() => {
      this.enteringSlide.set(null);
      this.transitionFrame = null;
    });

    if (this.transitionTimeout !== null) {
      window.clearTimeout(this.transitionTimeout);
    }
    this.transitionTimeout = window.setTimeout(() => {
      this.previousSlide.set(null);
      this.transitionTimeout = null;
    }, 800);
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
