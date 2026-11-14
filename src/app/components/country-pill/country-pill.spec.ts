import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CountryPill } from './country-pill';

describe('CountryPill', () => {
  let component: CountryPill;
  let fixture: ComponentFixture<CountryPill>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CountryPill],
    }).compileComponents();

    fixture = TestBed.createComponent(CountryPill);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
