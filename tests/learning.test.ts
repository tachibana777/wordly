import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { validateLearningEvent } from '../src/lib/learning-event';
import { vocabulary } from '../src/data/vocabulary';
import { sentences } from '../src/data/sentences';
test('learning events use trusted vocabulary category and reject invalid scores/items', () => {
  const event = {id:randomUUID(),kind:'word',itemId:vocabulary[0].id,status:'known',score:0.5,category:'fake'};
  assert.equal(validateLearningEvent(event)?.category,vocabulary[0].category);
  assert.equal(validateLearningEvent({...event,score:100}),null);
  assert.equal(validateLearningEvent({...event,itemId:'missing'}),null);
  assert.equal(validateLearningEvent({...event,id:'bad'}),null);
  assert.equal(validateLearningEvent({...event,status:'admin'}),null);
});
test('sentence events require a real exercise, valid mode and binary score', () => {
  const event = {id:randomUUID(),kind:'sentence',itemId:String(sentences[0].id),mode:'easy',status:'practice',score:0};
  assert.equal(validateLearningEvent(event)?.category,'easy');
  assert.equal(validateLearningEvent({...event,mode:'fake'}),null);
  assert.equal(validateLearningEvent({...event,score:0.5}),null);
  assert.equal(validateLearningEvent({...event,itemId:'missing'}),null);
});
