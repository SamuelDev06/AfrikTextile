import { AfterViewInit, Component, ElementRef, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-engagements',
  templateUrl: './engagements.html',
  styleUrl: './engagements.css',
})
export class Engagements implements AfterViewInit, OnDestroy {
  private observer: IntersectionObserver | null = null;

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') {
      this.host.nativeElement.classList.add('engagements--visible');
      return;
    }

    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.host.nativeElement.classList.add('engagements--visible');
          this.observer?.disconnect();
          this.observer = null;
        }
      },
      { threshold: 0.2 },
    );
    this.observer.observe(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
