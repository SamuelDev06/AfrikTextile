import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Origins } from './origins';

describe('Origins', () => {
  let component: Origins;
  let fixture: ComponentFixture<Origins>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Origins],
    }).compileComponents();

    fixture = TestBed.createComponent(Origins);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display a pill for each country', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.country-pill').length).toBe(6);
    expect(element.textContent).toContain('Drapeau ivoirien');
  });
});
