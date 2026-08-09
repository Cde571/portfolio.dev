import writingsData from './writings.json';

export type WritingStatus = 'Borrador' | 'En revisión' | 'Publicado';

export type WritingSection = {
  id: string;
  title: string;
  body: string[];
  bullets?: string[];
  note?: string;
};

export type Writing = {
  slug: string;
  title: string;
  excerpt: string;
  abstract: string;
  category: 'Estudio' | 'Nota técnica' | 'Ensayo';
  status: WritingStatus;
  date: string;
  dateLabel: string;
  readingMinutes: number;
  tags: string[];
  accent: string;
  image?: string;
  imageAlt?: string;
  sections: WritingSection[];
  sources?: { label: string; href: string }[];
};

export const writings = writingsData as Writing[];

export const writingCategories = ['Todos', ...Array.from(new Set(writings.map((writing) => writing.category)))];

export function getWriting(slug: string) {
  return writings.find((writing) => writing.slug === slug);
}
