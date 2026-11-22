import { Injectable } from '@angular/core';
import { upload } from '@vercel/blob/client';
import { getAuth } from 'firebase/auth';
import { firebaseApp } from './firebase-app';

@Injectable({ providedIn: 'root' })
export class BlobStorageService {
  private readonly auth = getAuth(firebaseApp);

  async upload(file: File, pathname: string): Promise<{ url: string; pathname: string }> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('ADMIN_USER_NOT_FOUND');
    const token = await user.getIdToken();
    const blob = await upload(pathname, file, {
      access: 'public',
      handleUploadUrl: '/api/blob/upload',
      clientPayload: token,
      contentType: file.type,
    });
    return { url: blob.url, pathname: blob.pathname };
  }

  async delete(urls: string[]): Promise<void> {
    if (!urls.length) return;
    const user = this.auth.currentUser;
    if (!user) throw new Error('ADMIN_USER_NOT_FOUND');
    const token = await user.getIdToken();
    const response = await fetch('/api/blob/delete', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ urls }),
    });
    if (!response.ok) throw new Error('BLOB_DELETE_FAILED');
  }
}
