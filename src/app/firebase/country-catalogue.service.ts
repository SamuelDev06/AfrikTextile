import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { DocumentData, Unsubscribe } from 'firebase/firestore';
import type { Country, CountryDraft } from '../models/country';
import { firebaseApp } from './firebase-app';

const initialCountries: CountryDraft[] = [
  { name: "Côte d'Ivoire", flag: '🇨🇮' },
  { name: 'Sénégal', flag: '🇸🇳' },
  { name: 'Mali', flag: '🇲🇱' },
  { name: 'Ghana', flag: '🇬🇭' },
  { name: 'Nigeria', flag: '🇳🇬' },
  { name: 'Togo', flag: '🇹🇬' },
];

function normalizeCountryName(name: string): string {
  return name.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
}

@Injectable({ providedIn: 'root' })
export class CountryCatalogueService {
  private readonly firestore = getFirestore(firebaseApp);
  private readonly countriesCollection = collection(this.firestore, 'countries');

  watchCountries(onChange: (countries: Country[]) => void, onError: (error: Error) => void): Unsubscribe {
    return onSnapshot(
      this.countriesCollection,
      (snapshot) => {
        try {
          const countries = snapshot.docs
            .map((countryDoc) => this.parseCountry(countryDoc.id, countryDoc.data()))
            .sort((first, second) => first.name.localeCompare(second.name, 'fr'));
          onChange(countries);
        } catch (error) {
          onError(error instanceof Error ? error : new Error('Données de pays invalides.'));
        }
      },
      onError,
    );
  }

  async saveCountry(draft: CountryDraft, id?: string): Promise<void> {
    const name = draft.name.trim();
    const flag = draft.flag.trim();
    const flagUrl = draft.flagUrl?.trim() ?? '';
    if (!name || (!flag && !flagUrl)) {
      throw new Error('COUNTRY_FIELDS_REQUIRED');
    }

    const snapshot = await getDocs(this.countriesCollection);
    const duplicate = snapshot.docs.some((countryDoc) => {
      const country = this.parseCountry(countryDoc.id, countryDoc.data());
      return country.id !== id && normalizeCountryName(country.name) === normalizeCountryName(name);
    });
    if (duplicate) {
      throw new Error('COUNTRY_ALREADY_EXISTS');
    }

    const countryData = { name, flag, ...(flagUrl ? { flagUrl } : {}), updatedAt: serverTimestamp() };
    if (id) {
      const countryRef = doc(this.firestore, 'countries', id);
      const existing = await getDoc(countryRef);
      if (!existing.exists()) {
        throw new Error('COUNTRY_NOT_FOUND');
      }

      const existingCountry = this.parseCountry(existing.id, existing.data());
      if (existingCountry.name !== name) {
        const textiles = await getDocs(
          query(collection(this.firestore, 'textiles'), where('country', '==', existingCountry.name)),
        );
        if (!textiles.empty) {
          throw new Error('COUNTRY_IN_USE');
        }
      }

      await updateDoc(countryRef, countryData);
    } else {
      await addDoc(this.countriesCollection, countryData);
    }
  }

  async deleteCountry(country: Country): Promise<void> {
    const textiles = await getDocs(
      query(collection(this.firestore, 'textiles'), where('country', '==', country.name)),
    );
    if (!textiles.empty) {
      throw new Error('COUNTRY_IN_USE');
    }

    await deleteDoc(doc(this.firestore, 'countries', country.id));
  }

  async addInitialCountries(): Promise<void> {
    const snapshot = await getDocs(this.countriesCollection);
    if (!snapshot.empty) {
      throw new Error('COUNTRIES_ALREADY_INITIALIZED');
    }

    const batch = writeBatch(this.firestore);
    for (const country of initialCountries) {
      const countryRef = doc(this.countriesCollection);
      batch.set(countryRef, { ...country, updatedAt: serverTimestamp() });
    }
    await batch.commit();
  }

  private parseCountry(id: string, data: DocumentData): Country {
    const { name, flag, flagUrl } = data;
    const parsedFlagUrl = typeof flagUrl === 'string' ? flagUrl.trim() : '';
    if (
      typeof name !== 'string' ||
      typeof flag !== 'string' ||
      !name.trim() ||
      (!flag.trim() && !parsedFlagUrl)
    ) {
      throw new Error(`Données invalides pour le pays ${id}.`);
    }

    return { id, name, flag, ...(parsedFlagUrl ? { flagUrl: parsedFlagUrl } : {}) };
  }
}
