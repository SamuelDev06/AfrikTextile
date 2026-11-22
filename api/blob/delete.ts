import { del } from '@vercel/blob';
import { authError, requireAdmin } from '../_firebase-admin';

type ApiRequest = {
  method?: string;
  headers: { authorization?: string | string[] };
  body?: { urls?: unknown };
};
type ApiResponse = { status(code: number): ApiResponse; json(value: unknown): void };

export default async function deleteHandler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' });
  try {
    await requireAdmin(new Request('https://local.invalid', {
      method: 'POST',
      headers: {
        authorization: Array.isArray(request.headers.authorization)
          ? request.headers.authorization[0] ?? ''
          : request.headers.authorization ?? '',
      },
    }));
    const urls: unknown = request.body?.urls;
    if (!Array.isArray(urls) || urls.length > 25 || !urls.every((url) => typeof url === 'string' && url.startsWith('https://'))) {
      return response.status(400).json({ error: 'Invalid blob URLs.' });
    }
    if (urls.length) await del(urls);
    return response.status(200).json({ deleted: urls.length });
  } catch (error) {
    const responseError = authError(error);
    if (responseError) return response.status(responseError.status).json(await responseError.json());
    console.error('Blob deletion failed.', error);
    return response.status(500).json({ error: 'Image cleanup failed.' });
  }
}
