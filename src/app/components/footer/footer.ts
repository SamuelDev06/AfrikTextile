import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  protected readonly currentYear = new Date().getFullYear();
  protected readonly portfolioUrl = 'https://mon-premier-portfolio.vercel.app/';
}
