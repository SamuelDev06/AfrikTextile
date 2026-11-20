import { Injectable } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { DocumentData, Unsubscribe } from 'firebase/firestore';
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import type { Textile, TextileDraft, TextileImage, TextileImagesDraft, TextileStatus } from '../models/textile';
import { firebaseApp } from './firebase-app';

const allowedStatuses: TextileStatus[] = ['available', 'low-stock', 'out-of-stock'];
const maxImageSize = 5 * 1024 * 1024;
const firestoreBatchLimit = 450;
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];

function isTextileStatus(value: unknown): value is TextileStatus {
  return allowedStatuses.some((status) => status === value);
}

function isTextileImage(value: unknown): value is TextileImage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'url' in value &&
    typeof value.url === 'string' &&
    value.url.trim().length > 0 &&
    'path' in value &&
    typeof value.path === 'string' &&
    value.path.trim().length > 0
  );
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
    imageDraft?: TextileImagesDraft,
  ): Promise<boolean> {
    const coverFile = imageDraft?.coverFile ?? null;
    const galleryFiles = imageDraft?.galleryFiles ?? [];
    const retainedImages = imageDraft?.retainedImages ?? [];
    const imageFiles = [...(coverFile ? [coverFile] : []), ...galleryFiles];
    if (imageFiles.some((file) => !allowedImageTypes.includes(file.type) || file.size > maxImageSize)) {
      throw new Error('IMAGE_INVALID');
    }
    if ((!id && !coverFile) || (!id && galleryFiles.length < 1)) {
      throw new Error('IMAGE_REQUIRED');
    }

    const plannedImageCount = (coverFile ? 1 : retainedImages.length) + galleryFiles.length;
    if (plannedImageCount < 2 || plannedImageCount > 5) {
      throw new Error('IMAGE_COUNT_INVALID');
    }

    const textileRef = id
      ? doc(this.firestore, 'textiles', id)
      : doc(collection(this.firestore, 'textiles'));
    const existing = id ? await getDoc(textileRef) : null;

    if (existing && !existing.exists()) {
      throw new Error('TEXTILE_NOT_FOUND');
    }

    const existingData = existing?.data();
    const previousImages = existingData ? this.readImages(existingData) : [];
    const uploadedImages: TextileImage[] = [];
    const uploadedPaths = new Set<string>();

    try {
      if (coverFile) {
        uploadedImages.push(await this.uploadTextileImage(textileRef.id, coverFile, 0, uploadedPaths));
      }
      for (let index = 0; index < galleryFiles.length; index += 1) {
        uploadedImages.push(
          await this.uploadTextileImage(
            textileRef.id,
            galleryFiles[index],
            index + (coverFile ? 1 : 0),
            uploadedPaths,
          ),
        );
      }
    } catch (error) {
      await this.cleanupUploadedImages(uploadedPaths);
      throw error;
    }

    const images = coverFile
      ? [...uploadedImages.slice(0, 1), ...retainedImages, ...uploadedImages.slice(1)]
      : [...retainedImages, ...uploadedImages];
    if (images.length < 2 || images.length > 5 || !images[0]) {
      await this.cleanupUploadedImages(uploadedPaths);
      throw new Error('IMAGE_COUNT_INVALID');
    }

    try {
      await setDoc(textileRef, {
        ...draft,
        imageUrl: images[0].url,
        imagePath: images[0].path,
        images,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      await this.cleanupUploadedImages(uploadedPaths);
      throw error;
    }

    const retainedPaths = new Set(images.map((image) => image.path));
    let cleanupWarning = false;
    for (const previousImage of previousImages) {
      if (retainedPaths.has(previousImage.path)) {
        continue;
      }
      try {
        await deleteObject(ref(this.storage, previousImage.path));
      } catch (error) {
        console.error('Le tissu est enregistré, mais une ancienne image n’a pas pu être supprimée.', error);
        cleanupWarning = true;
      }
    }

    return cleanupWarning;
  }

  async deleteTextile(textile: Textile): Promise<boolean> {
    await deleteDoc(doc(this.firestore, 'textiles', textile.id));
    let cleanupWarning = false;
    const imagePaths = new Set(textile.images.map((image) => image.path));
    if (textile.imagePath) {
      imagePaths.add(textile.imagePath);
    }
    for (const imagePath of imagePaths) {
      try {
        await deleteObject(ref(this.storage, imagePath));
      } catch (error) {
        console.error('Le tissu est supprimé, mais une image n’a pas pu être supprimée.', error);
        cleanupWarning = true;
      }
    }
    return cleanupWarning;
  }

  async deleteTextilesByCountry(country: string): Promise<{ deletedCount: number; imageCleanupWarning: boolean }> {
    const snapshot = await getDocs(
      query(collection(this.firestore, 'textiles'), where('country', '==', country)),
    );

    for (let start = 0; start < snapshot.docs.length; start += firestoreBatchLimit) {
      const batch = writeBatch(this.firestore);
      for (const textileDoc of snapshot.docs.slice(start, start + firestoreBatchLimit)) {
        batch.delete(textileDoc.ref);
      }
      await batch.commit();
    }

    let imageCleanupWarning = false;
    for (const textileDoc of snapshot.docs) {
      const imagePaths = this.readImagePaths(textileDoc.data());
      for (const imagePath of imagePaths) {
        try {
          await deleteObject(ref(this.storage, imagePath));
        } catch (error) {
          console.error(`Le tissu ${textileDoc.id} est supprimé, mais une image n’a pas pu être supprimée.`, error);
          imageCleanupWarning = true;
        }
      }
    }

    return { deletedCount: snapshot.size, imageCleanupWarning };
  }

  private parseTextile(id: string, data: DocumentData): Textile {
    const { name, country, description, price, status, featured } = data;
    const images = this.readImages(data);
    if (
      typeof name !== 'string' ||
      typeof country !== 'string' ||
      typeof description !== 'string' ||
      typeof price !== 'string' ||
      !isTextileStatus(status) ||
      typeof featured !== 'boolean'
    ) {
      throw new Error(`Données invalides pour le tissu ${id}.`);
    }

    return {
      id,
      name,
      country,
      description,
      price,
      status,
      imageUrl: images[0].url,
      imagePath: images[0].path,
      images,
      featured,
    };
  }

  private readImages(data: DocumentData): TextileImage[] {
    const storedImages = data['images'];
    if (storedImages === undefined) {
      const { imageUrl, imagePath } = data;
      if (
        typeof imageUrl === 'string' &&
        imageUrl.trim() &&
        typeof imagePath === 'string' &&
        imagePath.trim()
      ) {
        return [{ url: imageUrl, path: imagePath }];
      }
      throw new Error('Images de tissu invalides.');
    }
    if (!Array.isArray(storedImages) || storedImages.length === 0 || !storedImages.every(isTextileImage)) {
      throw new Error('Images de tissu invalides.');
    }
    return storedImages;
  }

  private readImagePaths(data: DocumentData): Set<string> {
    const paths = new Set<string>();
    const storedImages = data['images'];
    if (Array.isArray(storedImages)) {
      for (const image of storedImages) {
        if (isTextileImage(image) && image.path) {
          paths.add(image.path);
        }
      }
    }
    const legacyPath = data['imagePath'];
    if (typeof legacyPath === 'string' && legacyPath) {
      paths.add(legacyPath);
    }
    return paths;
  }

  private async uploadTextileImage(
    textileId: string,
    file: File,
    index: number,
    uploadedPaths: Set<string>,
  ): Promise<TextileImage> {
    const safeName = file.name.replace(/[^\w.-]/g, '_');
    const imagePath = `textiles/${textileId}/${Date.now()}-${index}-${safeName}`;
    const imageRef = ref(this.storage, imagePath);
    await uploadBytes(imageRef, file, { contentType: file.type });
    uploadedPaths.add(imagePath);
    return { url: await getDownloadURL(imageRef), path: imagePath };
  }

  private async cleanupUploadedImages(imagePaths: Set<string>): Promise<void> {
    for (const imagePath of imagePaths) {
      try {
        await deleteObject(ref(this.storage, imagePath));
      } catch (error) {
        console.error('Impossible de nettoyer une image après l’échec de l’enregistrement.', error);
      }
    }
  }
}
