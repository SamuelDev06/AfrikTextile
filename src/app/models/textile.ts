export type TextileStatus = 'available' | 'low-stock' | 'out-of-stock';

export interface Textile {
  id: string;
  name: string;
  country: string;
  description: string;
  price: string;
  status: TextileStatus;
  imageUrl: string;
  imagePath: string;
  featured: boolean;
}

export type TextileDraft = Omit<Textile, 'id' | 'imageUrl' | 'imagePath'>;
