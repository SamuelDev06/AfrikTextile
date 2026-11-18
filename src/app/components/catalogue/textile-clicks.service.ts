import { Injectable } from '@angular/core';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  collection,
  Firestore,
  getDocs,
  query,
  runTransaction,
  where,
  doc,
  getFirestore,
} from 'firebase/firestore';
import { firebaseConfig } from '../../firebase/firebase.config';

interface DailyClickCount {
  textileId: string;
  day: string;
  clicks: number;
}

@Injectable({ providedIn: 'root' })
export class TextileClicksService {
  private firestore?: Firestore;

  // La connexion est créée au premier accès à Firestore.
  private get database(): Firestore {
    if (!this.firestore) {
      const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
      this.firestore = getFirestore(app);
    }

    return this.firestore;
  }

  async recordClick(textileId: string): Promise<void> {
    const day = new Date().toISOString().slice(0, 10);
    const statRef = doc(this.database, 'textileClickStats', `${textileId}_${day}`);

    await runTransaction(this.database, async (transaction) => {
      const stat = await transaction.get(statRef);
      const clicks = stat.exists() ? Number(stat.data()['clicks']) + 1 : 1;

      transaction.set(statRef, { textileId, day, clicks });
    });
  }

  async getTopTextileIds(days = 30, limit = 3): Promise<string[]> {
    const today = new Date();
    const firstDay = new Date(today);
    firstDay.setUTCDate(firstDay.getUTCDate() - (days - 1));

    const statsQuery = query(
      collection(this.database, 'textileClickStats'),
      where('day', '>=', firstDay.toISOString().slice(0, 10)),
      where('day', '<=', today.toISOString().slice(0, 10)),
    );
    const stats = await getDocs(statsQuery);
    const totals = new Map<string, number>();

    stats.forEach((stat) => {
      const clickCount = stat.data() as DailyClickCount;
      totals.set(
        clickCount.textileId,
        (totals.get(clickCount.textileId) ?? 0) + clickCount.clicks,
      );
    });

    return [...totals.entries()]
      .sort(([idA, clicksA], [idB, clicksB]) => clicksB - clicksA || idA.localeCompare(idB))
      .slice(0, limit)
      .map(([textileId]) => textileId);
  }
}
