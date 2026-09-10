import { categories, vocabulary } from '../data/vocabulary';
import { study } from './study';
import type { ProgressState, Score, WordStatus } from '../types';
export const LEGACY_KEY = 'wordly.progress.v1';
const ids = new Set(vocabulary.map(word => word.id));
export function cleanProgress(raw: unknown): ProgressState {
  const state: ProgressState = {records: {}, activity: {}, category: 'all'};
  if (!raw || typeof raw !== 'object') return state;
  const value = raw as Partial<ProgressState>;
  for (const [id, record] of Object.entries(value.records || {})) {
    if (ids.has(id) && record && ['known', 'practice'].includes(record.status)) {
      state.records[id] = {status: record.status};
      if (record.score !== undefined && [0, 0.5, 1].includes(record.score)) state.records[id].score = record.score;
    }
  }
  for (const [day, count] of Object.entries(value.activity || {})) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isSafeInteger(count) && count > 0) state.activity[day] = count;
  }
  if (categories.some(category => category.id === value.category)) state.category = value.category!;
  return state;
}
export function createStorage(key = LEGACY_KEY, storage?: Pick<Storage, 'getItem' | 'setItem'>) {
  let persistent = true;
  let state = cleanProgress(null);
  let target = storage;
  try {target ??= localStorage; state = cleanProgress(JSON.parse(target.getItem(key) || 'null'));}
  catch {persistent = false;}
  function save() {
    try {if (!target) throw new Error(); target.setItem(key, JSON.stringify(state)); persistent = true;}
    catch {persistent = false;}
  }
  return {
    get state() {return state;}, get persistent() {return persistent;},
    rate(id: string, status: WordStatus, score?: Score) {
      if (!ids.has(id) || !['known', 'practice'].includes(status)) return;
      state.records[id] = {status};
      if (score !== undefined && [0, 0.5, 1].includes(score)) state.records[id].score = score;
      const today = study.dayKey(); state.activity[today] = (state.activity[today] || 0) + 1; save();
    },
    setCategory(category: string) {state.category = category; save();},
    importLegacy(raw: unknown) {
      const legacy = cleanProgress(raw);
      const previousActivity = state.activity;
      state = {category: state.category, records: {...legacy.records, ...state.records}, activity: {...legacy.activity}};
      // Import is offered once per account/browser; use maximums to avoid double-counting.
      for (const [day, count] of Object.entries(previousActivity)) state.activity[day] = Math.max(count, legacy.activity[day] || 0);
      save();
    },
  };
}
