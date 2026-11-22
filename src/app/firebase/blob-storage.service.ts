import { Injectable } from '@angular/core';
import { getAuth } from 'firebase/auth';
import { firebaseApp } from './firebase-app';

@Injectable({ providedIn: 'root' })
export class BlobStorageService {
  private readonly auth = getAuth(firebaseApp);

  async upload(file: File, pathname: string): Promise<{ url: string; pathname: string }> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('ADMIN_USER_NOT_FOUND');
    const token = await user.getIdToken();
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    const response = await fetch('/api/blob/upload', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ pathname, contentType: file.type, data: btoa(binary) }),
    });
    if (!response.ok) throw new Error('BLOB_UPLOAD_FAILED');
    return response.json() as Promise<{ url: string; pathname: string }>;
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
