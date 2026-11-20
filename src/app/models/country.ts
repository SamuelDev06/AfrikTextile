export interface Country {
  id: string;
  name: string;
  flag: string;
}

export type CountryDraft = Omit<Country, 'id'>;
