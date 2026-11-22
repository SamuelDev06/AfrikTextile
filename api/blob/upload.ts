import { handleUpload } from '@vercel/blob/client';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function adminApp() {
  if (getApps().length) return getApps()[0];
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) throw new Error('Firebase Admin environment variables are missing.');
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

type ApiRequest = Request & { body: unknown; headers: Headers };
type ApiResponse = { status(code: number): ApiResponse; json(value: unknown): void };

export default async function uploadHandler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' });
  try {
    const authHeader = request.headers.authorization ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return response.status(401).json({ error: 'Authentication required.' });
    const app = adminApp();
    const decoded = await getAuth(app).verifyIdToken(token);
    const admin = await getFirestore(app).doc(`admins/${decoded.uid}`).get();
    if (!admin.exists) return response.status(403).json({ error: 'Admin access required.' });

    const result = await handleUpload({
      body: request.body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const bearer = clientPayload;
        if (!bearer) throw new Error('UNAUTHORIZED');
        const verified = await getAuth(app).verifyIdToken(bearer);
        if (verified.uid !== decoded.uid) throw new Error('FORBIDDEN');
        const allowedFolder = pathname.startsWith(`textiles/`) || pathname.startsWith('countries/') || pathname.startsWith(`admins/${decoded.uid}/profile/`);
        if (!allowedFolder) throw new Error('FORBIDDEN');
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
          maximumSizeInBytes: pathname.startsWith('countries/') ? 2 * 1024 * 1024 : 5 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: decoded.uid,
        };
      },
      onUploadCompleted: async () => undefined,
    });
    return response.status(200).json(result);
  } catch (error) {
    console.error('Blob upload authorization failed.', error);
    return response.status(500).json({ error: 'Upload authorization failed.' });
  }
}
