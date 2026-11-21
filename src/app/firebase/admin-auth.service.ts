import { Injectable } from '@angular/core';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { firebaseApp } from './firebase-app';
import { compressImage } from '../utils/compress-image';

const maxProfilePhotoSize = 5 * 1024 * 1024;
const allowedProfilePhotoTypes = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly auth = getAuth(firebaseApp);
  private readonly firestore = getFirestore(firebaseApp);
  private readonly storage = getStorage(firebaseApp);

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
    const safeName = compressedFile.name.replace(/[^\w.-]/g, '_');
    const imagePath = `admins/${user.uid}/profile/${Date.now()}-${safeName}`;
    const imageRef = ref(this.storage, imagePath);
    await uploadBytes(imageRef, compressedFile, { contentType: compressedFile.type });

    let url: string;
    try {
      url = await getDownloadURL(imageRef);
      await updateProfile(user, { photoURL: url });
    } catch (error) {
      try {
        await deleteObject(imageRef);
      } catch (cleanupError) {
        console.error('Impossible de nettoyer la nouvelle photo de profil après un échec.', cleanupError);
      }
      throw error;
    }

    const previousPath = this.profileStoragePath(previousPhotoUrl, user.uid);
    if (!previousPath || previousPath === imagePath) {
      return { url, cleanupWarning: false };
    }

    try {
      await deleteObject(ref(this.storage, previousPath));
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

  private profileStoragePath(photoUrl: string | null, uid: string): string | null {
    if (!photoUrl) {
      return null;
    }

    try {
      const pathSegment = new URL(photoUrl).pathname.split('/o/')[1];
      if (!pathSegment) {
        return null;
      }
      const path = decodeURIComponent(pathSegment);
      return path.startsWith(`admins/${uid}/profile/`) ? path : null;
    } catch {
      return null;
    }
  }
}
