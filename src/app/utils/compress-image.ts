const supportedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];

export async function compressImage(
  file: File,
  maxDimension = 1600,
  quality = 0.82,
): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (error) {
    throw new Error('IMAGE_PROCESSING_FAILED', { cause: error });
  }

  try {
    const largestSide = Math.max(bitmap.width, bitmap.height);
    if (largestSide === 0) {
      throw new Error('IMAGE_PROCESSING_FAILED');
    }

    const scale = Math.min(1, maxDimension / largestSide);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('IMAGE_PROCESSING_FAILED');
    }
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error('IMAGE_PROCESSING_FAILED'));
          }
        },
        'image/webp',
        quality,
      );
    });

    if (!supportedImageTypes.includes(blob.type)) {
      throw new Error('IMAGE_PROCESSING_FAILED');
    }
    if (width === bitmap.width && height === bitmap.height && blob.size >= file.size) {
      return file;
    }

    const extension = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.${extension}`, {
      lastModified: file.lastModified,
      type: blob.type,
    });
  } finally {
    bitmap.close();
  }
}
