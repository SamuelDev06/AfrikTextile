import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin environment variables are missing.');
  }
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

export async function requireAdmin(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('UNAUTHORIZED');
  const app = getAdminApp();
  const decoded = await getAuth(app).verifyIdToken(token);
  const admin = await getFirestore(app).doc(`admins/${decoded.uid}`).get();
  if (!admin.exists) throw new Error('FORBIDDEN');
  return decoded.uid;
}

export function authError(error: unknown): Response | null {
  if (error instanceof Error && error.message === 'UNAUTHORIZED') {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }
  if (error instanceof Error && error.message === 'FORBIDDEN') {
    return Response.json({ error: 'Admin access required.' }, { status: 403 });
  }
  return null;
}
