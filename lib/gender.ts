import type { Enums } from '../supabase/types/database.types';

export type GenderDb = Enums<'gender_type'>;

const LABEL_TO_DB: Record<string, GenderDb> = {
  man: 'male',
  woman: 'female',
  'non-binary': 'non_binary',
  'prefer not to say': 'prefer_not_to_say',
};

const DB_TO_LABEL: Record<GenderDb, string> = {
  male: 'Man',
  female: 'Woman',
  non_binary: 'Non-binary',
  prefer_not_to_say: 'Prefer not to say',
};

export function genderLabelFromDb(value: GenderDb | null): string {
  if (!value) return '';
  return DB_TO_LABEL[value] ?? '';
}

export function genderDbFromLabel(label: string): GenderDb | null {
  const key = label.trim().toLowerCase();
  return LABEL_TO_DB[key] ?? null;
}

export const GENDER_OPTIONS = ['Man', 'Woman', 'Non-binary', 'Prefer not to say'] as const;
