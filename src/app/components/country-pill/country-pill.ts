import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-country-pill',
  templateUrl: './country-pill.html',
  styleUrl: './country-pill.css',
})
export class CountryPill {
  readonly name = input.required<string>();
  readonly description = input.required<string>();
  readonly active = input(false);
  readonly primary = input(false);
  readonly selected = output<string>();
}
