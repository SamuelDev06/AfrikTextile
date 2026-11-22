import { put } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authError, requireAdmin } from '../_firebase-admin';

const maxImageSize = 5 * 1024 * 1024;
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export default async function uploadHandler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' });
  try {
    const uid = await requireAdmin(new Request('https://local.invalid', {
      method: 'POST',
      headers: {
        authorization: Array.isArray(request.headers.authorization)
          ? request.headers.authorization[0] ?? ''
          : request.headers.authorization ?? '',
      },
    }));
    const { pathname, contentType, data } = request.body ?? {};
    if (
      typeof pathname !== 'string' ||
      typeof contentType !== 'string' ||
      !allowedTypes.has(contentType) ||
      typeof data !== 'string'
    ) return response.status(400).json({ error: 'Invalid image payload.' });

    const isAvatar = pathname.startsWith(`admins/${uid}/profile/`);
    const validFolder = pathname.startsWith('textiles/') || pathname.startsWith('countries/') || isAvatar;
    if (!validFolder) return response.status(403).json({ error: 'Invalid image destination.' });
    const bytes = Buffer.from(data, 'base64');
    const sizeLimit = pathname.startsWith('countries/') ? 2 * 1024 * 1024 : maxImageSize;
    if (bytes.length === 0 || bytes.length > sizeLimit) {
      return response.status(413).json({ error: 'Image exceeds the allowed size.' });
    }
    const blob = await put(pathname, bytes, { access: 'public', contentType, addRandomSuffix: true });
    return response.status(200).json({ url: blob.url, pathname: blob.pathname });
  } catch (error) {
    const authResponse = authError(error);
    if (authResponse) return response.status(authResponse.status).json(await authResponse.json());
    console.error('Blob upload failed.', error);
    if (error instanceof Error && error.message === 'Firebase Admin environment variables are missing.') {
      return response.status(500).json({
        error: 'Firebase Admin configuration is missing.',
        code: 'FIREBASE_ADMIN_CONFIG_MISSING',
      });
    }
    return response.status(500).json({ error: 'Image upload failed.' });
  }
}
