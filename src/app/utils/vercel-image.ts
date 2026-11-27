const imageWidths = [128, 256, 384, 512, 640, 768, 1080];
const publicBlobImagePattern =
  /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/(?:textiles|countries)\//i;

function canOptimize(url: string): boolean {
  const localHost =
    typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  return !localHost && publicBlobImagePattern.test(url);
}

export function vercelImageUrl(url: string, width = 640): string {
  if (!canOptimize(url)) return url;

  const params = new URLSearchParams({ url, w: String(width), q: '70' });
  return `/_vercel/image?${params.toString()}`;
}

export function vercelImageSrcSet(url: string): string | null {
  if (!canOptimize(url)) return null;

  return imageWidths.map((width) => `${vercelImageUrl(url, width)} ${width}w`).join(', ');
}
