export type TextileStatus = 'available' | 'low-stock' | 'out-of-stock';

export interface TextileImage {
  url: string;
  path: string;
}

export interface TextileImagesDraft {
  coverFile: File | null;
  galleryFiles: File[];
  retainedImages: TextileImage[];
}

export interface Textile {
  id: string;
  name: string;
  country: string;
  description: string;
  price: string;
  priceUsd: string;
  status: TextileStatus;
  imageUrl: string;
  imagePath: string;
  images: TextileImage[];
  featured: boolean;
}

export type TextileDraft = Omit<Textile, 'id' | 'imageUrl' | 'imagePath' | 'images'>;
