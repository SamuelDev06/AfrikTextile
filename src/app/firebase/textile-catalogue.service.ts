import { Injectable } from '@angular/core';
import { collection, deleteDoc, doc, getDoc, getFirestore, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import type { DocumentData, Unsubscribe } from 'firebase/firestore';
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import type { Textile, TextileDraft, TextileStatus } from '../models/textile';
import { firebaseApp } from './firebase-app';

const allowedStatuses: TextileStatus[] = ['available', 'low-stock', 'out-of-stock'];
const maxImageSize = 5 * 1024 * 1024;
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];

function isTextileStatus(value: unknown): value is TextileStatus {
  return allowedStatuses.some((status) => status === value);
}

@Injectable({ providedIn: 'root' })
export class TextileCatalogueService {
  private readonly firestore = getFirestore(firebaseApp);
  private readonly storage = getStorage(firebaseApp);

  watchTextiles(onChange: (textiles: Textile[]) => void, onError: (error: Error) => void): Unsubscribe {
    return onSnapshot(
      collection(this.firestore, 'textiles'),
      (snapshot) => {
        try {
          const textiles = snapshot.docs
            .map((textileDoc) => this.parseTextile(textileDoc.id, textileDoc.data()))
            .sort((first, second) => first.name.localeCompare(second.name, 'fr'));
          onChange(textiles);
        } catch (error) {
          onError(error instanceof Error ? error : new Error('Données de tissu invalides.'));
        }
      },
      onError,
    );
  }

  async saveTextile(
    draft: TextileDraft,
    id?: string,
    imageFile?: File | null,
  ): Promise<boolean> {
    if (imageFile && (!allowedImageTypes.includes(imageFile.type) || imageFile.size > maxImageSize)) {
      throw new Error('IMAGE_INVALID');
    }

    const textileRef = id
      ? doc(this.firestore, 'textiles', id)
      : doc(collection(this.firestore, 'textiles'));
    const existing = id ? await getDoc(textileRef) : null;

    if (existing && !existing.exists()) {
      throw new Error('TEXTILE_NOT_FOUND');
    }

    const existingData = existing?.data();
    let imageUrl = typeof existingData?.['imageUrl'] === 'string' ? existingData['imageUrl'] : '';
    let imagePath = typeof existingData?.['imagePath'] === 'string' ? existingData['imagePath'] : '';
    const previousImagePath = imagePath;
    let uploadedImagePath = '';

    if (imageFile) {
      const safeName = imageFile.name.replace(/[^\w.-]/g, '_');
      imagePath = `textiles/${textileRef.id}/${Date.now()}-${safeName}`;
      const imageRef = ref(this.storage, imagePath);
      await uploadBytes(imageRef, imageFile, { contentType: imageFile.type });
      uploadedImagePath = imagePath;
      try {
        imageUrl = await getDownloadURL(imageRef);
      } catch (error) {
        try {
          await deleteObject(imageRef);
        } catch (cleanupError) {
          console.error('Impossible de nettoyer l’image après l’échec de la création de son URL.', cleanupError);
        }
        throw error;
      }
    } else if (!id || !imageUrl) {
      throw new Error('IMAGE_REQUIRED');
    }

    try {
      await setDoc(textileRef, {
        ...draft,
        imageUrl,
        imagePath,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      if (uploadedImagePath) {
        try {
          await deleteObject(ref(this.storage, uploadedImagePath));
        } catch (cleanupError) {
          console.error('Impossible de nettoyer l’image après l’échec de l’enregistrement.', cleanupError);
        }
      }
      throw error;
    }

    if (uploadedImagePath && previousImagePath) {
      try {
        await deleteObject(ref(this.storage, previousImagePath));
      } catch (error) {
        console.error('Le tissu est enregistré, mais son ancienne image n’a pas pu être supprimée.', error);
        return true;
      }
    }

    return false;
  }

  async deleteTextile(textile: Textile): Promise<boolean> {
    await deleteDoc(doc(this.firestore, 'textiles', textile.id));

    if (!textile.imagePath) {
      return false;
    }

    try {
      await deleteObject(ref(this.storage, textile.imagePath));
      return false;
    } catch (error) {
      console.error('Le tissu est supprimé, mais son image n’a pas pu être supprimée.', error);
      return true;
    }
  }

  private parseTextile(id: string, data: DocumentData): Textile {
    const { name, country, description, price, status, imageUrl, imagePath, featured } = data;
    if (
      typeof name !== 'string' ||
      typeof country !== 'string' ||
      typeof description !== 'string' ||
      typeof price !== 'string' ||
      !isTextileStatus(status) ||
      typeof imageUrl !== 'string' ||
      typeof imagePath !== 'string' ||
      typeof featured !== 'boolean'
    ) {
      throw new Error(`Données invalides pour le tissu ${id}.`);
    }

    return { id, name, country, description, price, status, imageUrl, imagePath, featured };
  }
}
