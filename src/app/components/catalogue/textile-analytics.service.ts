import { Injectable } from '@angular/core';
import { getAnalytics, isSupported, logEvent } from 'firebase/analytics';
import type { Analytics } from 'firebase/analytics';
import { firebaseApp } from '../../firebase/firebase-app';

interface TextileClick {
  id: string;
  name: string;
  country: string;
}

@Injectable({ providedIn: 'root' })
export class TextileAnalyticsService {
  private readonly analytics = this.initializeAnalytics().catch((error: unknown) => {
    console.error('Firebase Analytics could not be initialized.', error);
    return null;
  });

  // Firebase Analytics is only initialized where the browser supports it.
  private async initializeAnalytics(): Promise<Analytics | null> {
    if (!(await isSupported())) {
      return null;
    }

    return getAnalytics(firebaseApp);
  }

  async recordWhatsappClick(textile: TextileClick): Promise<void> {
    const analytics = await this.analytics;

    if (!analytics) {
      throw new Error('Firebase Analytics is not supported in this browser.');
    }

    logEvent(analytics, 'whatsapp_click', {
      textile_id: textile.id,
      textile_name: textile.name,
      textile_country: textile.country,
    });
  }
}
