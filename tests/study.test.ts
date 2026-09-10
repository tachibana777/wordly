import test from 'node:test';
import assert from 'node:assert/strict';
import { vocabulary, categories } from '../src/data/vocabulary';
import { answers } from '../src/lib/answers';
import { study } from '../src/lib/study';
import { createStorage as makeStorage } from '../src/lib/storage';
import type { ProgressState, WordStatus } from '../src/types';
function load(saved?: string, blocked = false) {
  const entries = new Map<string, string>(saved === undefined ? [] : [['wordly.progress.v1', saved]]);
  const storage = {
    getItem(key: string) {if (blocked) throw new Error('Storage disabled'); return entries.get(key) ?? null;},
    setItem(key: string, value: string) {if (blocked) throw new Error('Storage disabled'); entries.set(key, value);},
  };
  return {vocabulary, categories, answers, study, entries, createStorage: () => makeStorage(undefined, storage)};
}
test('400 complete unique vocabulary entries, exactly 50 per category', () => {
    const { vocabulary, categories } = load();
    assert.equal(categories.length, 8);
    assert.equal(vocabulary.length, 400);
    assert.equal(new Set(vocabulary.map(word => word.id)).size, 400);
    assert.equal(new Set(vocabulary.map(word => word.word.toLowerCase())).size, 400);
    for (const category of categories) assert.equal(vocabulary.filter(word => word.category === category.id).length, 50, category.id);
    for (const word of vocabulary) {
        for (const field of (['word', 'partOfSpeech', 'meaning', 'hint', 'example'] as const)) assert.ok(typeof word[field] === 'string' && word[field].length > 0, `${word.id}.${field}`);
        assert.match(word.meaning, /[ก-๙]/, word.id);
        assert.match(word.hint, /[ก-๙]/, word.id);
        assert.match(word.example, /[A-Za-z]/, word.id);
        assert.notEqual(word.meaning, word.hint, word.id);
    }
});

test('global/category/review pools use current ratings', () => {
    const { vocabulary, study } = load();
    const records: ProgressState['records'] = { 'office-1': { status: 'practice' }, 'office-2': { status: 'known' }, 'dev-1': { status: 'practice' } };
    assert.equal(study.pool(vocabulary, 'all', false, records).length, 400);
    assert.equal(study.pool(vocabulary, 'office', false, records).length, 50);
    assert.equal(study.pool(vocabulary, 'all', true, records).length, 2);
    assert.equal(study.pool(vocabulary, 'office', true, records)[0].id, 'office-1');
    assert.equal(study.pool(vocabulary, 'hotel', true, records).length, 0);
    assert.equal(study.counts(vocabulary, records).unseen, 397);
});

test('random handles zero/one item, never immediately repeats, and includes first/last candidates', () => {
    const { study, vocabulary } = load();
    assert.equal(study.random([], null), null);
    assert.equal(study.random([vocabulary[0]], vocabulary[0].id), vocabulary[0]);
    assert.equal(study.random(vocabulary, null, () => 0), vocabulary[0]);
    assert.equal(study.random(vocabulary, null, () => .999999), vocabulary.at(-1));
    assert.equal(study.random(vocabulary, vocabulary[0].id, () => 0), vocabulary[1]);
    for (let i = 0; i < 100; i++) assert.notEqual(study.random(vocabulary, vocabulary[20].id)!.id, vocabulary[20].id);
});

test('latest answer changes status without inflating known total; activity counts each rated attempt', () => {
    const { createStorage, study, vocabulary, entries } = load();
    const storage = createStorage();
    storage.rate('office-1', 'practice');
    assert.equal(storage.state.records['office-1'].status, 'practice');
    storage.rate('office-1', 'known'); storage.rate('office-1', 'known');
    assert.equal(study.counts(vocabulary, storage.state.records).known, 1);
    assert.equal(study.counts(vocabulary, storage.state.records).practice, 0);
    assert.equal(storage.state.activity[study.dayKey()], 3);
    storage.rate('invalid', 'known'); storage.rate('office-1', 'invalid' as WordStatus);
    assert.equal(storage.state.activity[study.dayKey()], 3);
    storage.setCategory('hotel');
    const reloaded = load(entries.get('wordly.progress.v1')).createStorage();
    assert.equal(reloaded.state.records['office-1'].status, 'known');
    assert.equal(reloaded.state.category, 'hotel');
});

test('corrupt, obsolete, or blocked storage never breaks study', () => {
    assert.equal(Object.keys(load('{bad json').createStorage().state.records).length, 0);
    const filtered = load(JSON.stringify({ records: { 'office-1': { status: 'known' }, nope: { status: 'known' }, 'dev-1': { status: 'other' } }, activity: { '2026-09-10': 2, '2026-09-09': -1, invalid: 20 }, category: 'missing' })).createStorage();
    assert.equal(Object.keys(filtered.state.records).length, 1);
    assert.equal(Object.keys(filtered.state.activity).length, 1);
    assert.equal(filtered.state.category, 'all');
    const blocked = load(undefined, true).createStorage();
    blocked.rate('office-1', 'known');
    assert.equal(blocked.state.records['office-1'].status, 'known');
    assert.equal(blocked.persistent, false);
});

test('local dates, seven-day history, and streak across month boundary', () => {
    const { study } = load();
    const now = new Date(2026, 8, 2, 0, 5);
    const activity = { '2026-09-02': 1, '2026-09-01': 3, '2026-08-31': 2 };
    assert.equal(study.dayKey(now), '2026-09-02');
    assert.equal(study.streak(activity, now), 3);
    assert.equal(study.streak({ '2026-09-01': 1, '2026-08-31': 1 }, now), 2);
    assert.equal(study.streak({ '2026-08-31': 1 }, now), 0);
    const days = study.recentDays(activity, now);
    assert.equal(days.length, 7);
    assert.equal(days[0].key, '2026-08-27');
    assert.equal(days[6].count, 1);
});

test('every translation for all 400 words is accepted', () => {
    const { vocabulary, answers } = load();
    for (const word of vocabulary) {
        assert.ok(word.translations.length >= 2, word.word);
        assert.ok(word.translations.includes(word.meaning), word.word);
        for (const translation of word.translations) {
            assert.match(translation, /[ก-๙]/);
            assert.equal(answers.check(word, translation).status, 'correct', `${word.word}: ${translation}`);
        }
    }
});

test('answer matching accepts explicit synonyms and formatting, not substrings or negation', () => {
    const { vocabulary, answers } = load();
    const word = (english: string) => vocabulary.find(item => item.word === english)!;
    for (const answer of ['ช่องโหว่', 'จุดอ่อน', '  จุด อ่อน  ', 'จุด\u200Bอ่อน', '“จุดอ่อน”', 'จุดอ่อน.', 'ช่องโหว่, จุดอ่อน', 'ช่องโหว่ / จุดอ่อน', 'ช่องโหว่ หรือ จุดอ่อน']) {
        assert.equal(answers.check(word('Vulnerability'), answer).status, 'correct', answer);
    }
    for (const answer of ['', '   ', '\u200B', '...']) assert.equal(answers.check(word('Vulnerability'), answer).status, 'empty');
    for (const answer of ['จุด', 'ไม่ใช่จุดอ่อน', 'ช่องโหว่, โรงแรม', 'ช่องโหว่,', 'Vulnerability', '<script>ช่องโหว่</script>']) {
        assert.equal(answers.check(word('Vulnerability'), answer).status, 'unmatched', answer);
    }
    assert.equal(answers.check(word('Spicy'), 'ไม่เผ็ด').status, 'unmatched');
    assert.equal(answers.check(word('Safe'), 'ปลอดภัย').status, 'unmatched', 'Hotel noun is not the adjective');
    assert.equal(answers.check(word('Mouse'), 'หนู').status, 'unmatched', 'Computer context');
    assert.equal(answers.check(word('Authentication'), 'การอนุญาต').status, 'unmatched');
    assert.equal(answers.check(word('Authorization'), 'การยืนยันตัวตน').status, 'unmatched');
});

test('reviewed partial answers earn half credit without overriding complete meanings', () => {
    const { vocabulary, answers } = load();
    const reviewed = vocabulary.filter(word => word.partialTranslations);
    assert.equal(reviewed.length, 400);
    for (const word of reviewed) {
        assert.ok(word.partialExplanation, word.word);
        for (const value of word.partialTranslations!) {
            const result = answers.check(word, value);
            assert.equal(result.status, 'partial', `${word.word}: ${value}`);
            assert.equal(result.score, 0.5);
            assert.ok(result.explanation);
            assert.equal(answers.check(word, `ไม่ใช่${value}`).score, 0, `Negation: ${word.word}: ${value}`);
        }
    }
});

test('brute force accepts phrasing by meaning but rejects keywords alone and contradictions', () => {
    const { vocabulary, answers } = load();
    const word = vocabulary.find(word => word.word === 'Brute force')!;
    for (const value of ['คาดเดารหัส', 'การสุ่มรหัสผ่าน', 'สุ่มเดารหัสผ่านไปเรื่อยๆ', 'คือเดารหัสครับ', 'เดารหัส / สุ่มรหัส', 'การโจมตีโดยลองรหัสผ่านหลายครั้ง']) {
        assert.equal(answers.check(word, value).score, 0.5, value);
    }
    for (const value of ['ลองรหัสทุกค่า', 'การโจมตีโดยลองรหัสผ่านทุกความเป็นไปได้จนเจอรหัสที่ถูกต้อง', 'หมายถึงการไล่ลองรหัสผ่านค่ะ']) {
        assert.equal(answers.check(word, value).score, 1, value);
    }
    for (const value of ['รหัส', 'เดา', 'สุ่ม', 'ไม่ใช่สุ่มรหัส', 'ป้องกันการเดารหัส', 'สุ่มรหัสเพื่อสร้างรหัสผ่านใหม่', 'เดารหัส, โรงแรม', 'เดารหัส,', '<script>เดารหัส</script>', 'ลองรหัสทุกค่าแต่ไม่ต้องลองรหัส']) {
        assert.equal(answers.check(word, value).score, 0, value);
    }
});

test('natural wrappers and context-sensitive corrections retain meaning distinctions', () => {
    const { vocabulary, answers } = load();
    const check = (english: string, value: string) => answers.check(vocabulary.find(word => word.word === english)!, value).score;
    assert.equal(check('Vulnerability', 'หมายถึงจุดอ่อนครับ'), 1);
    assert.equal(check('Budget', 'งบการเงินที่จัดสรร'), 0);
    assert.equal(check('Shower', 'ฝักบัว'), 0);
    assert.equal(check('Shower', 'อาบน้ำ'), 0.5);
    assert.equal(check('Shower', 'อาบน้ำด้วยฝักบัว'), 1);
    assert.equal(check('Hash', 'การเข้ารหัส'), 0);
    assert.equal(check('Savory', 'กลิ่นคาว'), 0);
    assert.equal(check('Savory', 'ไม่หวาน'), 0.5);
    assert.equal(check('Authentication', 'กำหนดสิทธิ์'), 0);
    assert.equal(check('Authorization', 'ยืนยันตัวตน'), 0);
    assert.equal(check('Borrow', 'ให้ยืม'), 0);
    assert.equal(check('Lend', 'ยืมมา'), 0);
});

test('partial scores persist, stay in review, and do not inflate study activity', () => {
    const { createStorage, entries, study, vocabulary } = load();
    const storage = createStorage();
    storage.rate('cyber-28', 'practice', 0.5);
    const reloaded = load(entries.get('wordly.progress.v1')).createStorage();
    assert.equal(reloaded.state.records['cyber-28'].score, 0.5);
    assert.equal(study.pool(vocabulary, 'cyber', true, reloaded.state.records).length, 1);
    assert.equal(reloaded.state.activity[study.dayKey()], 1);
    reloaded.rate('cyber-28', 'known', 1);
    assert.equal(reloaded.state.records['cyber-28'].score, 1);
    assert.equal(study.pool(vocabulary, 'cyber', true, reloaded.state.records).length, 0);
    reloaded.rate('cyber-28', 'practice');
    assert.equal(reloaded.state.records['cyber-28'].score, undefined, 'Self rating does not retain an old test score');
});

test('all 400 profiles cover full and partial answers across all eight categories', () => {
    const { vocabulary, categories, answers } = load();
    assert.equal(vocabulary.filter(word => word.answerAliases?.length && word.partialTranslations?.length).length, 400);
    for (const category of categories) {
        const words = vocabulary.filter(word => word.category === category.id);
        assert.equal(words.filter(word => word.answerAliases?.length && word.partialTranslations?.length).length, 50, category.id);
    }
    for (const word of vocabulary) {
        for (const answer of word.answerAliases!) {
            assert.equal(answers.check(word, answer).score, 1, `${word.word}: ${answer}`);
            assert.equal(answers.check(word, `หมายถึง ${answer} นะครับ`).score, 1, `${word.word}: wrapper`);
            assert.equal(answers.check(word, `ไม่ใช่${answer}`).score, 0, `${word.word}: negation`);
            assert.equal(answers.check(word, `${answer}แต่จริงๆคือแตงโม`).score, 0, `${word.word}: contradiction`);
        }
    }
});

test('independent natural answers and confusing concepts in every category', () => {
    const { vocabulary, answers } = load();
    const cases = `
Hardware|1|เป็นส่วนประกอบของคอมที่จับต้องได้ครับ
Software|1|ชุดคำสั่งที่ควบคุมคอมทำงาน
Processor|1|ตัวประมวลผลคำสั่งของคอมพิวเตอร์
Memory|1|พื้นที่เก็บข้อมูลแบบชั่วคราวขณะทำงาน
Storage|1|พื้นที่จัดเก็บไฟล์แบบถาวรในคอม
Motherboard|1|แผงวงจรหลักที่เชื่อมอุปกรณ์ต่างๆในคอม
Keyboard|1|เป็นอุปกรณ์ที่ใช้พิมพ์ข้อความเข้าคอม
Mouse|1|อุปกรณ์ใช้เลื่อนลูกศรบนหน้าจอ
Monitor|1|จอแสดงภาพจากคอม
Printer|1|เครื่องปริ้นข้อความลงบนกระดาษ
Scanner|1|เครื่องแปลงเอกสารให้เป็นไฟล์
Speaker|1|ตัวส่งเสียงออกจากคอม
Microphone|1|เป็นอุปกรณ์ที่ใช้รับเสียงเข้าคอมพิวเตอร์
Webcam|1|กล้องวิดีโอที่ติดกับคอม
Headphones|1|อุปกรณ์ใช้ฟังเสียงแบบครอบหู
Cable|1|สายที่เชื่อมต่อระหว่างอุปกรณ์เข้าด้วยกัน
Port|1|ช่องเสียบสายบนคอม
Adapter|1|อุปกรณ์ใช้แปลงหัวต่อให้เข้ากัน
Battery|1|ตัวสะสมพลังงานไฟฟ้าให้อุปกรณ์
Charger|1|อุปกรณ์ใช้เติมไฟให้แบต
Desktop|1|เครื่องคอมแบบตั้งโต๊ะ
Laptop|1|โน๊ตบุ๊ค
Tablet|1|คอมพิวเตอร์แบบแผ่นที่มีจอสัมผัส
Operating system|1|โปรแกรมหลักที่ควบคุมฮาร์ดแวร์และโปรแกรม
Application|1|แอพพลิเคชั่น
Browser|1|โปรแกรมสำหรับเปิดเว็บไซต์
Tab|1|หน้าเว็บที่เปิดอยู่ในเบราว์เซอร์
Window|1|กรอบแสดงโปรแกรมบนหน้าจอ
Folder|1|พื้นที่ใช้จัดกลุ่มไฟล์เข้าด้วยกัน
File|1|ชุดข้อมูลที่มีชื่อและบันทึกไว้ในเครื่อง
Extension|1|ส่วนท้ายชื่อไฟล์ที่ระบุประเภทไฟล์
Shortcut|1|ไอคอนที่เปิดโปรแกรมได้รวดเร็ว
Clipboard|1|พื้นที่พักข้อมูลที่ก๊อปไว้ชั่วคราว
Download|1|ดึงข้อมูลจากเว็บมาไว้ในคอมของเรา
Upload|1|นำข้อมูลจากเครื่องไปยังเว็บไซต์
Install|1|ติดตั้งแอปลงเครื่อง
Uninstall|1|เอาแอปออกจากเครื่อง
Restart|1|ปิดเครื่องแล้วเปิดเครื่องใหม่อีกครั้ง
Shut down|1|สั่งปิดการทำงานของคอม
Update|1|ปรับโปรแกรมให้เป็นเวอร์ชั่นใหม่
Driver|1|ซอฟต์แวร์ที่ช่วยให้ระบบสื่อสารกับฮาร์ดแวร์ได้
Network|1|กลุ่มอุปกรณ์ที่เชื่อมต่อและแลกเปลี่ยนข้อมูลกัน
Router|1|ตัวส่งต่อข้อมูลระหว่างเครือข่าย
Bandwidth|1|ปริมาณการส่งข้อมูลสูงสุดต่อวินาที
Latency|1|ระยะเวลาหน่วงของเครือข่าย
Server|1|คอมที่ให้บริการเครื่องอื่น
Cloud|1|บริการประมวลผลระยะไกลผ่านอินเทอร์เน็ต
Backup|1|ทำสำเนาไฟล์ไว้เผื่อกู้คืน
Resolution|1|จำนวนพิกเซลของภาพ
Screenshot|1|รูปที่แคปจากหน้าจอ
Parameter|1|ตัวแปรที่รับค่าในนิยามฟังก์ชั่น
Argument|1|ข้อมูลที่ส่งเข้าไปให้ฟังก์ชันตอนเรียกใช้
Boolean|1|ชนิดข้อมูลที่มีได้แค่จริงหรือเท็จเท่านั้น
Method|1|ฟังก์ชั่นที่อยู่ในออบเจค
Library|1|คลังโค้ดสำเร็จรูปที่เรียกใช้ได้
API|1|ช่องทางที่ให้โปรแกรมสื่อสารระหว่างกัน
Backend|1|ส่วนจัดการข้อมูลฝั่งเซิร์ฟเวอร์
Refactor|1|จัดโครงสร้างโค้ดใหม่โดยผลลัพธ์เหมือนเดิม
Authentication|1|พิสูจน์ตัวตนของผู้ใช้
Authorization|1|ตรวจสอบสิทธิ์การเข้าถึงของผู้ใช้
Firewall|1|ระบบที่กรองทราฟฟิกของเครือข่ายตามกฎ
Ransomware|1|มัลแวร์ที่ล็อกข้อมูลแล้วเรียกเงิน
Phishing|1|ใช้อีเมลปลอมเพื่อหลอกให้เปิดเผยข้อมูล
Keylogger|1|ตัวที่ดักการกดคีย์บอร์ด
Penetration test|1|ทดลองโจมตีระบบโดยได้รับอนุญาต
Brute force|0.5|เดารหัสผ่าน
Agenda|1|เรื่องที่เตรียมไว้คุยในที่ประชุม
Deadline|1|เวลาสุดท้ายที่ต้องเสร็จงาน
Colleague|1|คนที่ทำงานด้วยกัน
Invoice|1|บิลที่แจ้งยอดเงิน
Postpone|1|เลื่อนนัดไปวันหลัง
Efficient|0.5|ทำงานเร็ว
Promotion|0|ส่วนลดสินค้า
Budget|0|เงินเดือน
Room service|1|บริการเสิร์ฟเครื่องดื่มให้แขกถึงห้อง
Twin room|1|ห้องพักที่มีสองเตียงแยกกัน
Check-in|1|แจ้งการเข้าพัก
Complimentary|1|บริการไม่คิดค่าใช้จ่ายเพิ่มเติม
Safe|1|ตู้เก็บของมีค่าที่ล็อกได้
Minibar|0.5|ตู้เย็นเล็ก
Floor|0|พื้นดิน
Receptionist|0|ผู้เข้าพัก
Appetizer|1|อาหารที่เสิร์ฟก่อนอาหารจานหลัก
Side dish|1|ของที่กินคู่กับอาหารจานหลัก
Steamed|1|อาหารที่ปรุงด้วยการใช้ไอน้ำ
Boiled|1|อาหารที่ทำให้สุกด้วยน้ำเดือด
Fried|1|อาหารที่ปรุงโดยน้ำมันร้อน
Vegan|0.5|มังสวิรัติ
Spicy|0|ไม่เผ็ด
Waiter|0.5|พนักงานเสิร์ฟ
Receipt|1|หลักฐานที่แสดงว่าจ่ายเงินแล้ว
Borrow|1|เอาของคนอื่นมาใช้ชั่วคราวแล้วจะคืน
Lend|1|ให้คนอื่นเอาของเราไปใช้ชั่วคราวแล้วคืน
Shower|1|อาบน้ำโดยใช้ฝักบัว
Commute|0.5|เดินทางไปกลับ
Change|0.5|เงินคืน
Lend|0|เอาของคนอื่นมาใช้แล้วคืน
Borrow|0|ให้คนอื่นยืม
Nonstop flight|1|บินที่ไม่หยุดพักระหว่างทาง
Carry-on|1|สัมภาระที่นำเข้าห้องโดยสารเอง
Checked baggage|1|กระเป๋าที่ฝากไว้ใต้ท้องเครื่อง
Passport|1|หนังสือเดินทางไปต่างประเทศ
Boarding pass|0.5|ตั๋วเครื่องบิน
Accommodation|0.5|โรงแรม
Departure|0|มาถึง
Arrival|0|ออกเดินทาง
Download|0|ส่งข้อมูลจากคอมขึ้นเว็บ
Upload|0|ดึงไฟล์จากเว็บลงเครื่อง
Memory|0|พื้นที่เก็บไฟล์ถาวร
Storage|0|หน่วยความจำชั่วคราว
Microphone|0|อุปกรณ์ส่งเสียงออก
Speaker|0|อุปกรณ์รับเสียง
Parameter|0|ค่าที่ส่งตอนเรียกฟังก์ชัน
Argument|0|ชื่อช่องรับค่าในนิยามฟังก์ชัน
Authentication|0|กำหนดสิทธิ์ใช้งาน
Authorization|0|ยืนยันตัวตนผู้ใช้
Encryption|0|ถอดรหัสข้อมูล
Decryption|0|เข้ารหัสข้อมูล
Browser|0|ไม่ใช่โปรแกรมเปิดเว็บ
Router|0|อุปกรณ์ที่ใช้เปิดเว็บแต่ไม่ส่งต่อข้อมูล
`;
    for (const row of cases.trim().split('\n')) {
        const [english, expected, answer] = row.split('|');
        assert.equal(answers.check(vocabulary.find(word => word.word === english)!, answer).score, Number(expected), `${english}: ${answer}`);
    }
});

test('Thai sara am and grammatical wrappers preserve meaningful words', () => {
    const { vocabulary, answers } = load();
    const check = (term: string, value: string) => answers.check(vocabulary.find(word => word.word === term)!, value).score;
    assert.equal(check('Software', 'ชุดคำสั่งที่ทำให้คอมทำงาน'.normalize('NFKC')), 1);
    assert.equal(check('Boiled', 'อาหารที่ทำให้สุกด้วยน้ำเดือด'.normalize('NFKC')), 1);
    assert.equal(check('Boiled', 'ต้มในน\u0E4D\u0E49าเดือด'), 1, 'Alternate Thai tone ordering');
    assert.equal(check('Browser', 'เป็นโปรแกรมที่ใช้สำหรับเปิดเว็บไซต์นะคะ'), 1);
    assert.equal(check('Folder', 'พื้นที่ใช้จัดกลุ่มไฟล์เข้าด้วยกัน'), 1);
    assert.equal(answers.phrasing('พื้นที่ใช้จัดกลุ่มไฟล์'), 'พื้นที่ใช้จัดกลุ่มไฟล์');
    assert.equal(check('Browser', 'เป็นโปรแกรมที่ไม่ใช้สำหรับเปิดเว็บไซต์'), 0);
});
