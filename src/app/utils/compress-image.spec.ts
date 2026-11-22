import { compressImage } from './compress-image';

describe('compressImage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('resizes large photos and uploads them as WebP', async () => {
    const bitmap = {
      width: 4000,
      height: 2000,
      close: vi.fn(),
    } as unknown as ImageBitmap;
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));

    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ drawImage: vi.fn() })),
      toBlob: vi.fn((callback: BlobCallback) =>
        callback(new Blob(['compressed'], { type: 'image/webp' })),
      ),
    } as unknown as HTMLCanvasElement;
    vi.spyOn(document, 'createElement').mockReturnValue(canvas);

    const original = new File([new Uint8Array(20_000)], 'fabric.jpg', { type: 'image/jpeg' });
    const result = await compressImage(original);

    expect(canvas.width).toBe(1600);
    expect(canvas.height).toBe(800);
    expect(result.type).toBe('image/webp');
    expect(result.name).toBe('fabric.webp');
    expect(bitmap.close).toHaveBeenCalledOnce();
  });
});
