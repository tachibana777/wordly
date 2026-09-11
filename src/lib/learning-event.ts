import { vocabulary } from '@/data/vocabulary';
import { sentences } from '@/data/sentences';
const words = new Map(vocabulary.map(word => [word.id, word]));
export function validateLearningEvent(body: Record<string, unknown>) {
  const {id, kind, itemId, status, score, mode} = body;
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return null;
  if (status !== 'known' && status !== 'practice') return null;
  if (score !== undefined && score !== 0 && score !== 0.5 && score !== 1) return null;
  if (kind === 'word' && typeof itemId === 'string' && words.has(itemId)) {
    return {id, kind, itemId, status, score: score ?? null, category: words.get(itemId)!.category};
  }
  if (kind === 'sentence' && sentences.some(item => String(item.id) === itemId) && (mode === 'easy' || mode === 'hard') && (score === 0 || score === 1)) {
    return {id, kind, itemId, status, score, category: mode};
  }
  return null;
}
