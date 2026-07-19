export type AppLanguage = 'it' | 'en';

export interface DocumentCategoryLabel {
  category_name?: string | null;
  category_name_it?: string | null;
}

export interface DocumentTypeLabel {
  type_name?: string | null;
  type_name_it?: string | null;
}

export function getDocumentCategoryLabel(
  category: DocumentCategoryLabel | null | undefined,
  language: AppLanguage
): string {
  if (!category) return '';
  const en = category.category_name?.trim() || '';
  const it = category.category_name_it?.trim() || '';
  if (language === 'it') return it || en || '—';
  return en || it || '—';
}

export function getDocumentTypeLabel(
  type: DocumentTypeLabel | null | undefined,
  language: AppLanguage
): string {
  if (!type) return '';
  const en = type.type_name?.trim() || '';
  const it = type.type_name_it?.trim() || '';
  if (language === 'it') return it || en || '—';
  return en || it || '—';
}
