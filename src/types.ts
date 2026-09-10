export type WordStatus = 'known' | 'practice';
export type Score = 0 | 0.5 | 1;
export interface Word {
  id: string; category: string; categoryName: string; word: string;
  partOfSpeech: string; meaning: string; hint: string; example: string;
  translations: string[]; answerAliases?: string[]; partialTranslations?: string[];
  partialExplanation?: string;
  answerPatterns?: { correct?: RegExp[]; partial?: RegExp[] };
  meaningPatterns?: RegExp[];
}
export interface Category {id: string; name: string; english: string; icon: string; color: string; description: string}
export interface Sentence {id: number; thai: string; answer: string; hint: string; alternatives: string[]}
export interface ProgressState {
  records: Record<string, {status: WordStatus; score?: Score}>;
  activity: Record<string, number>;
  category: string;
}
export interface User { id: string; email: string }
