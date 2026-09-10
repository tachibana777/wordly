'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { categories, vocabulary } from '@/data/vocabulary';
import { createStorage, LEGACY_KEY } from '@/lib/storage';
import { study } from '@/lib/study';
import { post } from '@/lib/api';
import type { User, Word, WordStatus, Score } from '@/types';
import { Icon } from './Icon';
import { Flashcard } from './Flashcard';
import { Library } from './Library';
import { Sentences } from './Sentences';
import { ProgressAside, ProgressPage } from './Progress';
import { Feedback } from './Feedback';
const pages = {practice: 'ฝึกคำศัพท์', library: 'คลังคำศัพท์', sentences: 'แต่งประโยค', progress: 'ความคืบหน้า', feedback: 'แนะนำ / แจ้งปัญหา'};
type Page = keyof typeof pages;
export function WordlyApp({user}: {user: User}) {
  const [storage, setStorage] = useState<ReturnType<typeof createStorage> | null>(null);
  const [, refresh] = useState(0);
  const [page, setPage] = useState<Page>('practice');
  const [review, setReview] = useState(false);
  const [word, setWord] = useState<Word | null>(null);
  const [cardVersion, setCardVersion] = useState(0);
  const [toast, setToast] = useState(''); const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [legacy, setLegacy] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  useEffect(() => {
    const accountStorage = createStorage(`wordly.progress.v2.${user.id}`); setStorage(accountStorage);
    setWord(study.random(study.pool(vocabulary, accountStorage.state.category, false, accountStorage.state.records)));
    try {setLegacy(!!localStorage.getItem(LEGACY_KEY) && !localStorage.getItem(`wordly.imported.${user.id}`));} catch {}
    const hash = () => {const next = location.hash.slice(1); setPage(Object.hasOwn(pages, next) ? next as Page : 'practice');}; hash();
    const visible = () => {if (!document.hidden) refresh(n => n + 1);};
    window.addEventListener('hashchange', hash); document.addEventListener('visibilitychange', visible);
    const timer = setInterval(visible, 60000);
    return () => {window.removeEventListener('hashchange', hash); document.removeEventListener('visibilitychange', visible); clearInterval(timer); if (toastTimer.current) clearTimeout(toastTimer.current);};
  }, [user.id]);
  useEffect(() => {document.title = `${pages[page]} · Wordly`; if ('speechSynthesis' in window) window.speechSynthesis.cancel();}, [page]);
  function navigate(next: Page) {setPage(next); location.hash = next; window.scrollTo({top: 0, behavior: 'smooth'});}
  function announce(message: string) {setToast(message); if (toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 3500);}
  function nextWord(category = storage!.state.category, reviewOnly = review, selected?: Word) {
    setWord(selected || study.random(study.pool(vocabulary, category, reviewOnly, storage!.state.records), word?.id)); setCardVersion(n => n + 1);
  }
  function selectCategory(category: string) {storage!.setCategory(category); refresh(n => n + 1); nextWord(category); document.querySelector('.study-toolbar')?.scrollIntoView({behavior: 'smooth', block: 'start'});}
  function setMode(mode: boolean) {setReview(mode); nextWord(storage!.state.category, mode);}
  function rate(id: string, status: WordStatus, score?: Score) {storage!.rate(id, status, score); refresh(n => n + 1);}
  function importProgress() {
    try {storage!.importLegacy(JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null')); if (!storage!.persistent) throw new Error(); localStorage.setItem(`wordly.imported.${user.id}`, 'yes'); setLegacy(false); refresh(n => n + 1); announce('นำเข้าความคืบหน้าเดิมแล้ว');}
    catch {announce('นำเข้าไม่สำเร็จ ข้อมูลเดิมยังอยู่ในเบราว์เซอร์');}
  }
  async function logout() {
    if (logoutBusy) return; setLogoutBusy(true);
    try {await post('/api/auth/logout', {}); window.location.replace('/login');}
    catch (error) {announce(error instanceof Error ? error.message : 'ออกจากระบบไม่สำเร็จ'); setLogoutBusy(false);}
  }
  if (!storage) return <main className="auth-shell" role="status">กำลังเปิดพื้นที่เรียนรู้ของคุณ…</main>;
  const {records, activity, category} = storage.state;
  const counts = study.counts(study.pool(vocabulary, category, false, records), records);
  const navIcons = {practice: 'cards', library: 'book', sentences: 'book', progress: 'chart', feedback: 'info'};
  return <div id="app"><aside className="sidebar"><a className="brand" href="#practice" onClick={() => navigate('practice')} aria-label="Wordly หน้าฝึกคำศัพท์"><span className="brand-mark">w<span>·</span></span><span>wordly<span className="brand-dot">.</span></span></a><div className="sidebar-caption">YOUR LITTLE ENGLISH SPACE</div><nav className="navigation" aria-label="เมนูหลัก"><span className="nav-label">พื้นที่การเรียนรู้</span>{(Object.keys(pages) as Page[]).map(key => <button key={key} className={`nav-item ${page === key ? 'active' : ''}`} data-page={key} aria-current={page === key ? 'page' : undefined} onClick={() => navigate(key)}><Icon name={navIcons[key]}/><span>{pages[key]}</span>{key === 'library' && <span className="nav-count">400</span>}</button>)}</nav><div className="sidebar-bottom"><div className="little-note"><span className="note-icon"><Icon name="leaf"/></span><p>วันละนิด ก็เก่งขึ้นได้</p><span>ไม่ต้องจำได้ทุกคำในวันเดียว<br/>แค่กลับมาเรียนรู้ทุกวันก็พอ</span><div className="note-dots"><i/><i/><i/><i/><i/></div></div><div className="local-profile"><span className="avatar"><Icon name="sun"/></span><div><strong>พื้นที่เรียนรู้ของคุณ</strong><span>{user.email}</span></div></div></div></aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb">พื้นที่การเรียนรู้ <Icon name="chevron"/> <strong>{pages[page]}</strong></div><div className="topbar-right"><span className="streak-badge"><Icon name="flame"/><span>{study.streak(activity)} วันต่อเนื่อง</span></span><div className="account-actions"><span className="account-email">{user.email}</span><button className="text-button" onClick={logout} disabled={logoutBusy}>{logoutBusy ? 'กำลังออก…' : 'ออกจากระบบ'}</button></div></div></header>
      <main id="main-content" className="page-content">{legacy && <div className="import-banner"><span>พบความคืบหน้าจากเวอร์ชันเดิมบนเบราว์เซอร์นี้ หากเป็นข้อมูลของคุณ สามารถนำเข้าบัญชีนี้ได้</span><button className="secondary" onClick={importProgress}>นำเข้าข้อมูลเดิม</button><button className="text-button" onClick={() => {setLegacy(false); try {localStorage.setItem(`wordly.imported.${user.id}`, 'dismissed');} catch {}}}>ไม่ใช่ข้อมูลของฉัน</button></div>}
        <section id="practice-page" hidden={page !== 'practice'}><div className="hero"><div><div className="greeting"><Icon name="sun"/> พื้นที่เล็ก ๆ สำหรับการเติบโตของคุณ</div><h1>เก่งขึ้นวันละคำ<span className="accent">.</span></h1><p>ไม่ต้องรีบ ไม่ต้องเป๊ะ แค่เรียนรู้คำใหม่ในทุก ๆ วัน</p></div><div className="hero-note"><span className="hand-spark">✧</span><span>Small steps.<br/><em>Big possibilities.</em></span><span className="hand-loop">↝</span></div></div>
          <div className="study-layout"><div className="study-main"><div className="study-toolbar"><div className="mode-switch" role="group" aria-label="โหมดการฝึก"><button className={!review ? 'active' : ''} data-mode="all" aria-pressed={!review} onClick={() => setMode(false)}><Icon name="shuffle"/> สุ่มคำศัพท์</button><button className={review ? 'active' : ''} data-mode="review" aria-pressed={review} onClick={() => setMode(true)}><Icon name="repeat"/> ทบทวน <span className="review-count">{counts.practice}</span></button></div><label className="category-select-label"><span className="sr-only">หมวดคำศัพท์ที่ต้องการฝึก</span><select id="category-select" value={category} onChange={event => selectCategory(event.target.value)}><option value="all">ทุกหมวดหมู่</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><div className="deck-caption"><span><i/><span className="deck-description">{review ? 'ฝึกซ้ำอีกนิด ให้จำได้ขึ้นใจ' : category === 'all' ? 'เปิดโลกคำศัพท์จากทุกหมวด' : categories.find(c => c.id === category)?.description}</span></span><span className="deck-count">{study.pool(vocabulary, category, review, records).length} คำในชุดนี้</span></div><Flashcard key={cardVersion} active={page === 'practice'} word={word} onRate={rate} onSkip={() => nextWord()} onExitReview={() => setMode(false)} announce={announce}/><div className="keyboard-help"><Icon name="info"/><span>ใช้คีย์บอร์ดได้ด้วย</span><span><kbd>Space</kbd> เฉลย</span><span><kbd>H</kbd> คำใบ้</span><span><kbd>→</kbd> ข้าม</span></div></div><ProgressAside state={storage.state} onProgress={() => navigate('progress')} onReview={() => {storage.setCategory('all'); setReview(true); nextWord('all', true); navigate('practice');}}/></div>
          <section className="category-section"><div className="section-heading"><div><h2>เลือกโลกที่อยากเรียนรู้ <span>8 หมวดหมู่</span></h2><p>คำศัพท์ที่ใช้ได้จริง ในเรื่องที่ใกล้ตัวคุณ</p></div><button className="text-button all-categories" onClick={() => selectCategory('all')}>สุ่มทุกหมวด <Icon name="arrow"/></button></div><div className="category-grid">{categories.map(item => {const count = study.counts(vocabulary.filter(w => w.category === item.id), records); return <button className={`category-card ${category === item.id ? 'selected' : ''}`} key={item.id} data-category={item.id} aria-pressed={category === item.id} style={{'--category-color': item.color} as CSSProperties} onClick={() => selectCategory(item.id)}><div className="category-card-top"><span className="category-icon"><Icon name={item.icon}/></span><span className="category-count">50 คำ</span></div><h3>{item.name}</h3><p lang="en">{item.english}</p><div className="category-progress"><div><span style={{width: `${count.known / count.total * 100}%`}}/></div><small>จำได้ {count.known}/{count.total}</small></div></button>;})}</div></section>
        </section>
        <div hidden={page !== 'library'}><Library records={records} onStudy={selected => {storage.setCategory(selected.category); setReview(false); nextWord(selected.category, false, selected); navigate('practice');}}/></div>
        <div hidden={page !== 'sentences'}><Sentences/></div><div hidden={page !== 'progress'}><ProgressPage state={storage.state} onPractice={() => navigate('practice')}/></div><div hidden={page !== 'feedback'}><Feedback/></div>
      </main><footer className="footer"><span className="footer-brand">wordly.</span><span>เรียนรู้วันละคำ เติบโตทุกวัน</span><details className="sources"><summary>เกี่ยวกับคำศัพท์ <Icon name="info"/></summary><div className="sources-content"><strong>400 คำและวลี สำหรับฝึกใช้จริง</strong><p>คัดเลือกคำ แปลไทย และเขียนคำใบ้กับประโยคตัวอย่างสำหรับเว็บนี้ ความหมายเลือกตามบริบทของแต่ละหมวด</p><span>แหล่งอ่านเพิ่มเติม</span><a href="https://learnenglish.britishcouncil.org/free-resources/vocabulary" target="_blank" rel="noopener noreferrer">British Council · คำศัพท์ทั่วไป</a><a href="https://developer.mozilla.org/en-US/docs/Glossary" target="_blank" rel="noopener noreferrer">MDN · คำศัพท์เว็บและการพัฒนา</a><a href="https://csrc.nist.gov/glossary" target="_blank" rel="noopener noreferrer">NIST · คำศัพท์ความปลอดภัย</a></div></details><span className="storage-caption"><Icon name={storage.persistent ? 'check' : 'info'}/>{storage.persistent ? 'บันทึกการเรียนของบัญชีนี้บนเบราว์เซอร์นี้' : 'เก็บได้เฉพาะรอบนี้ · เบราว์เซอร์ไม่อนุญาตให้บันทึก'}</span></footer>
    </div><div className={`toast ${toast ? 'visible' : ''}`} role="status" aria-live="polite">{toast}</div>
  </div>;
}
