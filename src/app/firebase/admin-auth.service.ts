import { Injectable } from '@angular/core';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { firebaseApp } from './firebase-app';
import { compressImage } from '../utils/compress-image';
import { BlobStorageService } from './blob-storage.service';

const maxProfilePhotoSize = 5 * 1024 * 1024;
const allowedProfilePhotoTypes = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly auth = getAuth(firebaseApp);
  private readonly firestore = getFirestore(firebaseApp);
  constructor(private readonly blobStorage: BlobStorageService) {}

  get currentUser(): User | null {
    return this.auth.currentUser;
  }

  async signIn(email: string, password: string): Promise<void> {
    const { user } = await signInWithEmailAndPassword(this.auth, email, password);

    try {
      if (!(await this.hasAdminRecord(user))) {
        await signOut(this.auth);
        throw new Error('ADMIN_ACCESS_DENIED');
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'ADMIN_ACCESS_DENIED') {
        throw error;
      }

      try {
        await signOut(this.auth);
      } catch (signOutError) {
        console.error('Impossible de fermer la session après l’échec de vérification admin.', signOutError);
      }
      throw error;
    }
  }

  async hasAdminAccess(): Promise<boolean> {
    const user = await this.waitForAuthState();
    return user !== null && this.hasAdminRecord(user);
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
  }

  async updateProfilePhoto(file: File): Promise<{ url: string; cleanupWarning: boolean }> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('ADMIN_USER_NOT_FOUND');
    }
    if (!allowedProfilePhotoTypes.includes(file.type) || file.size > maxProfilePhotoSize) {
      throw new Error('PROFILE_IMAGE_INVALID');
    }

    const previousPhotoUrl = user.photoURL;
    const compressedFile = await compressImage(file, 1024);
    let url: string;
    try {
      const uploaded = await this.blobStorage.upload(compressedFile, `admins/${user.uid}/profile/${Date.now()}-${compressedFile.name}`);
      url = uploaded.url;
      await updateProfile(user, { photoURL: url });
    } catch (error) {
      throw error;
    }

    if (!previousPhotoUrl || previousPhotoUrl === url || !previousPhotoUrl.includes('.blob.vercel-storage.com/')) {
      return { url, cleanupWarning: false };
    }

    try {
      await this.blobStorage.delete([previousPhotoUrl]);
      return { url, cleanupWarning: false };
    } catch (error) {
      console.error('La photo de profil a été mise à jour, mais l’ancienne image n’a pas pu être supprimée.', error);
      return { url, cleanupWarning: true };
    }
  }

  private async hasAdminRecord(user: User): Promise<boolean> {
    const adminRecord = await getDoc(doc(this.firestore, 'admins', user.uid));
    return adminRecord.exists();
  }

  private waitForAuthState(): Promise<User | null> {
    return new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(
        this.auth,
        (user) => {
          unsubscribe();
          resolve(user);
        },
        (error) => {
          unsubscribe();
          reject(error);
        },
      );
    });
  }

}
