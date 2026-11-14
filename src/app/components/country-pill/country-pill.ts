import { Component, input } from '@angular/core';

@Component({
  selector: 'app-country-pill',
  templateUrl: './country-pill.html',
  styleUrl: './country-pill.css',
})
export class CountryPill {
  readonly name = input.required<string>();
  readonly description = input.required<string>();
}
