export interface Country {
  id: string;
  name: string;
  flag: string;
  flagUrl?: string;
}

export type CountryDraft = Omit<Country, 'id'>;
