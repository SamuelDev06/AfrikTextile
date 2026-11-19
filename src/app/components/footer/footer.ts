import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  protected readonly currentYear = new Date().getFullYear();
  // À renseigner lorsque le lien du portfolio sera prêt.
  protected readonly portfolioUrl: string | null = null;
}
