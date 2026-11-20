import { Injectable } from '@angular/core';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { firebaseApp } from './firebase-app';

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly auth = getAuth(firebaseApp);
  private readonly firestore = getFirestore(firebaseApp);

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
