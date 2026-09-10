'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { answers, type AnswerResult } from '@/lib/answers';
import type { Score, Word, WordStatus } from '@/types';
import { Icon } from './Icon';
interface Props {word: Word | null; onRate: (id: string, status: WordStatus, score?: Score) => void; onSkip: () => void; onExitReview: () => void; announce: (message: string) => void; active: boolean}
export function Flashcard({word, onRate, onSkip, onExitReview, announce, active}: Props) {
  const [revealed, setRevealed] = useState(false);
  const [hint, setHint] = useState(false);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const composing = useRef(false);
  const submitted = useRef(false);
  const speechId = useRef(0);
  const firstRate = useRef<HTMLButtonElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  function reveal() {if (!word || revealed) return; setRevealed(true);}
  function rate(status: WordStatus) {
    if (!word || !revealed || submitted.current) return;
    submitted.current = true; onRate(word.id, status); onSkip();
  }
  useEffect(() => {if (revealed) {if (result && result.status !== 'empty') feedback.current?.focus({preventScroll: true}); else firstRate.current?.focus({preventScroll: true});}}, [revealed, result]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!active || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      const target = event.target as HTMLElement;
      if (target.closest('input, select, textarea, [contenteditable="true"], summary')) return;
      const key = event.key.toLowerCase();
      if (key === ' ' && target.closest('button, a')) return;
      if (key === ' ') {event.preventDefault(); reveal();}
      else if (key === 'h') setHint(true);
      else if (key === '1') rate('practice');
      else if (key === '2') rate('known');
      else if (key === 'arrowright') {event.preventDefault(); onSkip();}
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });
  useEffect(() => {
    return () => {speechId.current++; if ('speechSynthesis' in window) window.speechSynthesis.cancel();};
  }, []);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!word || revealed || submitted.current || composing.current) return;
    const checked = answers.check(word, answer); setResult(checked);
    if (checked.status === 'empty') {input.current?.focus(); return;}
    submitted.current = true; setRevealed(true);
    onRate(word.id, checked.status === 'correct' ? 'known' : 'practice', checked.score);
  }
  function speak() {
    if (!word || !('speechSynthesis' in window)) {announce('เบราว์เซอร์นี้ไม่รองรับการออกเสียง'); return;}
    window.speechSynthesis.cancel(); const id = ++speechId.current;
    const speech = new SpeechSynthesisUtterance(word.word); speech.lang = 'en-US'; speech.rate = .85;
    const voice = window.speechSynthesis.getVoices().find(v => v.lang === 'en-US') || window.speechSynthesis.getVoices().find(v => v.lang.startsWith('en'));
    if (voice) speech.voice = voice;
    speech.onend = () => {if (id === speechId.current) setSpeaking(false);};
    speech.onerror = event => {if (id !== speechId.current) return; setSpeaking(false); if (!['canceled','interrupted'].includes(event.error)) announce('อุปกรณ์นี้ยังเล่นเสียงไม่ได้ ลองตรวจสอบเสียงภาษาอังกฤษของเบราว์เซอร์');};
    setSpeaking(true); window.speechSynthesis.speak(speech);
  }
  if (!word) return <section className="flashcard"><div className="empty-state"><Icon name="check"/><h2>ไม่มีคำที่ต้องทบทวนในหมวดนี้</h2><p>เริ่มฝึกแล้วเลือก “ยังจำไม่ได้” คำเหล่านั้นจะกลับมาตรงนี้</p><button className="primary" onClick={onExitReview}>กลับไปฝึกทุกคำ</button></div></section>;
  return <section className={`flashcard ${revealed ? 'is-revealed' : ''}`} aria-label="การ์ดฝึกคำศัพท์"><div className="card-content">
    <div className="card-top"><span className="word-category">{word.categoryName}</span><span className="card-label">ENGLISH → THAI</span></div>
    <div className="question-area"><span className="eyebrow">รู้จักคำนี้ไหม?</span><div className="word-heading"><h2 ref={heading} id="word-display" lang="en" tabIndex={-1}>{word.word}</h2><button className={`sound-button ${speaking ? 'speaking' : ''}`} aria-label="ฟังการออกเสียง" onClick={speak}><Icon name="sound"/></button></div><span className="word-pos" lang="en">{word.partOfSpeech}</span>{!revealed && <div className="hint-area"><button className={`hint-button ${hint ? 'hint-open' : ''}`} aria-expanded={hint} aria-controls="hint-text" onClick={() => setHint(true)}><Icon name="bulb"/> ขอคำใบ้ <kbd>H</kbd></button><p id="hint-text" className="hint-text" hidden={!hint}>{hint ? word.hint : ''}</p></div>}</div>
    {(!revealed || submitted.current) && <form className="translation-form" onSubmit={submit}><label htmlFor="translation-input">คำนี้แปลว่าอะไร?</label><p id="translation-help">แปลหรืออธิบายความหมายตามหมวดด้วยคำของคุณ · ถูก 1 คะแนน / เข้าใจบางส่วน 0.5 คะแนน</p><div className="translation-controls"><input ref={input} id="translation-input" lang="th" placeholder="พิมพ์คำแปลของคุณ…" maxLength={250} autoComplete="off" spellCheck={false} value={answer} onChange={event => {setAnswer(event.target.value); setResult(null);}} readOnly={submitted.current} onCompositionStart={() => {composing.current = true;}} onCompositionEnd={() => {composing.current = false;}} aria-invalid={result?.status === 'empty'} aria-describedby="translation-help translation-error"/><button className="primary check-answer" type="submit" disabled={submitted.current}>ตรวจคำตอบ <Icon name="check"/></button></div><p id="translation-error" className="input-error" role="alert" hidden={result?.status !== 'empty'}>พิมพ์คำแปลก่อนตรวจคำตอบ หรือกดเปิดเฉลยได้เลย</p></form>}
    {result && result.status !== 'empty' && <div ref={feedback} className={`answer-result ${result.status}`} role="status" tabIndex={-1}><strong>{result.status === 'correct' ? 'แปลถูกแล้ว! · 1 / 1 คะแนน' : result.status === 'partial' ? 'เข้าใจถูกบางส่วน · 0.5 / 1 คะแนน' : 'ยังไม่ตรงกับคำแปลที่รองรับ · 0 / 1 คะแนน'}</strong><p>{result.status === 'correct' ? 'เก็บเป็นคำที่จำได้แล้ว' : result.status === 'partial' ? `${result.explanation} · เก็บไว้ทบทวนอีกครั้ง` : 'เก็บคำนี้ไว้ทบทวนแล้ว ระบบตรวจจากคำเทียบที่เตรียมไว้ จึงอาจยังไม่รองรับบางสำนวนที่ถูกต้อง'}</p></div>}
    {revealed && <div className="answer-area"><div className="answer-divider"><span>ความหมายในหมวดนี้</span></div><h3 className="meaning">{word.meaning}</h3><div className="accepted-meanings"><h4>คำแปลที่รับได้</h4><ul>{word.translations.map(text => <li key={text}>{text}</li>)}</ul><p>เลือกตอบเพียงความหมายเดียวก็ได้ · คำนี้อาจมีความหมายอื่นเมื่อใช้ต่างบริบท</p></div><div className="example"><span>ลองใช้ในประโยค</span><p lang="en">{word.example}</p></div></div>}
    {!revealed && <div className="question-actions"><p className="card-prompt">ยังนึกไม่ออก? ดูความหมายแล้วลองจำไปด้วยกัน</p><button className="secondary reveal-button" onClick={reveal}><Icon name="eye"/> เปิดเฉลย <kbd>Space</kbd></button></div>}
    {revealed && !submitted.current && <div className="answer-actions"><p className="card-prompt">คำนี้เป็นยังไงบ้าง? เลือกตามที่จำได้จริง ๆ เลย</p><div className="rating-buttons"><button ref={firstRate} className="practice-button" onClick={() => rate('practice')}><Icon name="repeat"/> ยังจำไม่ได้ <kbd>1</kbd></button><button className="known-button" onClick={() => rate('known')}><Icon name="check"/> จำได้แล้ว <kbd>2</kbd></button></div></div>}
    {submitted.current && <div className="submitted-actions"><p>บันทึกผลครั้งนี้แล้ว</p><button className="primary next-answer" onClick={onSkip}>คำถัดไป <Icon name="arrow"/></button></div>}
    <div className="card-bottom"><span><Icon name="shuffle"/> สุ่มคำใหม่ทุกครั้ง</span><button className="skip-button" onClick={onSkip}>ข้ามคำนี้ <Icon name="arrow"/></button></div>
  </div></section>;
}
