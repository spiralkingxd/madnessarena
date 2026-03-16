import 'server-only';
import { cookies } from 'next/headers';

type Dictionary = typeof import('./dictionaries/pt.json');

const dictionaries = {
  en: () => import('./dictionaries/en.json').then((module) => module.default as Dictionary),
  pt: () => import('./dictionaries/pt.json').then((module) => module.default as Dictionary),
};

export const getLocale = async () => {
  const cookieStore = await cookies();
  const lang = cookieStore.get('NEXT_LOCALE')?.value;
  return (lang === 'en' ? 'en' : 'pt') as 'en' | 'pt';
};

export const getDictionary = async () => {
  const locale = await getLocale();
  return dictionaries[locale]();
};
