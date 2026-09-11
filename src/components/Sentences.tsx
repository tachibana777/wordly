'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { sentences, sentenceAnswers } from '@/data/sentences';
import { post } from '@/lib/api';
export function Sentences() {
  const [mode, setMode] = useState<'easy' | 'hard'>('easy');
  const [positions, setPositions] = useState({easy: 0, hard: 0});
  return <section id="sentences-page"><div className="hero"><div><div className="greeting">ต่อคำเป็นประโยค ทีละนิดทุกวัน</div><h1>ฝึกแต่งประโยค<span className="accent">.</span></h1><p>อ่านโจทย์ภาษาไทย แล้วลองแต่งเป็นภาษาอังกฤษ</p></div></div><div className="sentence-toolbar"><div className="mode-switch" role="group" aria-label="ระดับการแต่งประโยค">{(['easy','hard'] as const).map(level => <button key={level} className={mode === level ? 'active' : ''} aria-pressed={mode === level} onClick={() => setMode(level)}>{level === 'easy' ? 'ง่าย · เรียงคำ' : 'ยาก · พิมพ์เอง'}</button>)}</div><span className="sentence-count">ข้อ {positions[mode] + 1} / {sentences.length}</span></div><SentenceExercise key={`${mode}-${positions[mode]}`} mode={mode} position={positions[mode]} next={() => setPositions({...positions, [mode]: (positions[mode] + 1) % sentences.length})}/></section>;
}
function SentenceExercise({mode, position, next}: {mode: 'easy' | 'hard'; position: number; next: () => void}) {
  const item = sentences[position];
  const [bank, setBank] = useState<{id: number; text: string}[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [typed, setTyped] = useState('');
  const [hint, setHint] = useState(false);
  const [solution, setSolution] = useState(false);
  const [solved, setSolved] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const words = item.answer.split(' ').map((text, id) => ({id, text}));
    for (let i = words.length - 1; i > 0; i--) {const j = Math.floor(Math.random() * (i + 1)); [words[i], words[j]] = [words[j], words[i]];}
    if (words.map(w => w.text).join(' ') === item.answer) words.push(words.shift()!);
    setBank(words);
  }, [item]);
  function submit(event: FormEvent) {
    event.preventDefault(); if (solved) return;
    const value = mode === 'hard' ? typed : selected.map(id => bank.find(w => w.id === id)!.text).join(' ');
    if (!value.trim()) {setMessage('ลองแต่งประโยคก่อนตรวจคำตอบ'); return;}
    const correct = !!sentenceAnswers.check(item, value); setSolved(correct); setSolution(correct);
    void post('/api/learning', {id:crypto.randomUUID(),kind:'sentence',itemId:String(item.id),mode,status:correct ? 'known' : 'practice',score:correct ? 1 : 0})
      .catch(() => setMessage(previous => previous + ' · ส่งกิจกรรมการเรียนไม่สำเร็จ แต่ฝึกต่อได้'));
    setMessage(correct ? 'ถูกต้อง! แต่งประโยคได้แล้ว' : 'ยังไม่ตรงกับคำตอบ ลองเรียงคำหรือแก้ประโยคอีกครั้ง');
  }
  function clear() {setSelected([]); setTyped(''); setSolved(false); setSolution(false); setMessage('');}
  return <div className="sentence-card"><p className="sentence-instruction">{mode === 'easy' ? 'กดเลือกคำศัพท์มาเรียงเป็นประโยค' : 'พิมพ์ประโยคภาษาอังกฤษด้วยตัวเอง'}</p><h2 className="sentence-question" tabIndex={-1}>{item.thai}</h2><form className="sentence-form" onSubmit={submit}>
    {mode === 'easy' ? <div className="sentence-easy"><p id="sentence-order-label">ประโยคของคุณ · กดคำเพื่อเอาออก</p><div className="sentence-selected" role="group" aria-labelledby="sentence-order-label">{selected.length ? selected.map(id => <button key={id} type="button" className="sentence-word" disabled={solved} onClick={() => setSelected(selected.filter(value => value !== id))}>{bank.find(word => word.id === id)!.text}</button>) : <span>เลือกคำจากด้านล่างมาเรียงตรงนี้</span>}</div><p id="sentence-bank-label">คำศัพท์ที่ให้ · กดเพื่อเรียงคำ</p><div className="sentence-bank" role="group" aria-labelledby="sentence-bank-label">{bank.map(word => <button key={word.id} type="button" className="sentence-word" disabled={solved || selected.includes(word.id)} onClick={() => setSelected([...selected, word.id])}>{word.text}</button>)}</div></div>
      : <div className="sentence-hard"><label htmlFor="sentence-input">ประโยคภาษาอังกฤษของคุณ</label><textarea id="sentence-input" rows={3} lang="en" placeholder="เขียนประโยคภาษาอังกฤษที่นี่…" spellCheck={false} value={typed} readOnly={solved} maxLength={1000} onChange={event => setTyped(event.target.value)}/><p className="sentence-note">ตรวจเทียบกับคำตอบที่เตรียมไว้ ประโยคที่ถูกต้องรูปแบบอื่นอาจยังไม่อยู่ในชุดคำตอบ</p></div>}
    <div className="sentence-actions"><button type="submit" className="sentence-primary sentence-check" disabled={solved}>ตรวจคำตอบ</button><button type="button" className="sentence-clear" onClick={clear}>เริ่มเรียง / พิมพ์ใหม่</button><button type="button" className="sentence-hint-button" aria-expanded={hint} aria-controls="sentence-hint" onClick={() => setHint(true)}>ขอคำใบ้</button><button type="button" className="sentence-reveal" onClick={() => setSolution(true)}>ดูเฉลย</button></div></form>
    <p id="sentence-hint" className="sentence-hint" hidden={!hint}>{hint ? item.hint : ''}</p><p className={`sentence-feedback ${solved ? 'correct' : ''}`} role="status">{message}</p>{solution && <div className="sentence-solution"><strong>ตัวอย่างคำตอบ</strong><p lang="en">{item.answer}</p>{item.alternatives.length > 0 && <small>ตอบได้อีกแบบ: {item.alternatives.join(' / ')}</small>}</div>}<div className="sentence-bottom"><span>ค่อย ๆ ฝึกทีละประโยค</span><button className="sentence-next" onClick={next}>ข้อถัดไป →</button></div>
  </div>;
}
