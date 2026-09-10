const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
    const options = { headless: true };
    if (process.env.BROWSER_CHANNEL) options.channel = process.env.BROWSER_CHANNEL;
    const browser = await chromium.launch(options);
    try {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const url = process.env.TEST_URL || pathToFileURL(path.resolve(__dirname, '../index.html')).href;
        await page.goto(url);
        await page.locator('#word-display').waitFor();
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.evaluate(() => [...document.fonts].some(font => font.family === 'Noto Sans Thai' && font.status === 'loaded')), true, 'Local Thai font loads');
        assert.equal(await page.evaluate(() => EngVocab.vocabulary.length), 400);
        assert.equal(await page.locator('.meaning').textContent(), '');
        assert.equal(await page.locator('#hint-text').isVisible(), false);
        await page.locator('.hint-button').click();
        assert.equal(await page.locator('#hint-text').isVisible(), true);
        assert.equal(await page.locator('.answer-area').isVisible(), false);
        const initialWord = await page.locator('#word-display').textContent();
        await page.locator('.reveal-button').click();
        assert.equal(await page.locator('.answer-area').isVisible(), true);
        assert.ok((await page.locator('.meaning').textContent()).length > 0);
        await page.locator('.practice-button').click();
        assert.notEqual(await page.locator('#word-display').textContent(), initialWord);
        assert.equal(await page.locator('.answer-area').isVisible(), false);
        assert.equal(await page.locator('#hint-text').isVisible(), false);
        await page.locator('[data-mode="review"]').click();
        assert.equal(await page.locator('#word-display').textContent(), initialWord);
        await page.locator('.reveal-button').click();
        await page.locator('.known-button').click();
        assert.equal(await page.locator('.flashcard .empty-state').isVisible(), true);
        await page.locator('.exit-review').click();
        assert.equal(await page.locator('#word-display').isVisible(), true);
        await page.reload();
        assert.equal(await page.locator('.progress-line.known strong').textContent(), '1 คำ');
        assert.equal(await page.locator('.goal-ring strong').textContent(), '2/ 20');
        await page.locator('.skip-button').click();
        assert.equal(await page.locator('.goal-ring strong').textContent(), '2/ 20', 'Skipping does not count as study');

        for (const category of ['office', 'computer', 'dev', 'cyber', 'hotel', 'restaurant', 'daily', 'travel']) {
            await page.locator('#category-select').selectOption(category);
            assert.equal(await page.locator('.deck-count').textContent(), '50 คำในชุดนี้');
            const word = await page.locator('#word-display').textContent();
            assert.equal(await page.evaluate(({ word, category }) => EngVocab.vocabulary.some(item => item.word === word && item.category === category), { word, category }), true);
        }
        await page.locator('#category-select').selectOption('all');
        assert.equal(await page.locator('.deck-count').textContent(), '400 คำในชุดนี้');
        await page.locator('#word-display').focus();
        await page.keyboard.press('h');
        assert.equal(await page.locator('#hint-text').isVisible(), true);
        await page.keyboard.press('Space');
        assert.equal(await page.locator('.answer-area').isVisible(), true);
        await page.keyboard.press('2');
        assert.equal(await page.locator('.answer-area').isVisible(), false);
        await page.locator('[data-page="library"]').click();
        await page.locator('.search-field input').fill('ช่องโหว่');
        assert.ok((await page.locator('.library-word h2').allTextContents()).includes('Vulnerability'));
        await page.getByRole('button', { name: 'ฝึกคำว่า Vulnerability', exact: true }).click();
        assert.equal(await page.locator('#word-display').textContent(), 'Vulnerability');
        assert.equal(await page.locator('#category-select').inputValue(), 'cyber');
        await page.locator('[data-page="library"]').click();
        await page.locator('.search-field input').fill('no-results-123');
        assert.equal(await page.locator('.library-empty').isVisible(), true);
        await page.locator('.clear-filters').click();
        assert.equal(await page.locator('.word-row').count(), 20);
        await page.locator('.next-page').click();
        assert.equal(await page.locator('.pagination span').textContent(), 'หน้า 2 / 20');
        await page.locator('[data-page="progress"]').click();
        assert.equal(await page.locator('.breakdown-row').count(), 8);
        assert.equal(await page.locator('.chart-column').count(), 7);

        fs.mkdirSync(path.resolve(__dirname, '../artifacts'), { recursive: true });
        await page.locator('[data-page="practice"]').click();
        await page.locator('#category-select').selectOption('all');
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: 'artifacts/desktop.png', fullPage: true });
        for (const width of [390, 320, 768, 1024]) {
            await page.setViewportSize({ width, height: 844 });
            for (const tab of ['practice', 'library', 'progress']) {
                await page.locator(`[data-page="${tab}"]`).click();
                const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
                assert.equal(overflow, false, `${tab} at ${width}px overflows`);
            }
        }
        await page.setViewportSize({ width: 390, height: 844 });
        await page.locator('[data-page="library"]').click();
        await page.locator('.search-field input').fill('Multi-factor authentication');
        await page.locator('.word-row button').click();
        await page.locator('.reveal-button').click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Long word on mobile');
        await page.screenshot({ path: 'artifacts/mobile-answer.png', fullPage: true });
        await page.locator('.known-button').click();
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: 'artifacts/mobile.png', fullPage: true });
        await page.evaluate(() => localStorage.setItem('wordly.progress.v1', '{bad'));
        await page.reload();
        assert.equal(await page.locator('#word-display').isVisible(), true);
        assert.equal(await page.locator('.progress-line.known strong').textContent(), '0 คำ');
        async function studyWord(english) {
            await page.locator('[data-page="library"]').click();
            await page.locator('.search-field input').fill(english);
            await page.getByRole('button', { name: `ฝึกคำว่า ${english}`, exact: true }).click();
        }
        await studyWord('Vulnerability');
        assert.equal(await page.locator('.accepted-meanings li').count(), 0, 'Translations are not revealed in advance');
        await page.locator('.check-answer').click();
        assert.equal(await page.locator('#translation-error').isVisible(), true);
        assert.equal(await page.locator('.goal-ring strong').textContent(), '0/ 20');
        await page.locator('#translation-input').fill('  จุด อ่อน  ');
        await page.locator('#translation-input').press('Enter');
        assert.equal(await page.locator('.answer-result.correct').isVisible(), true);
        assert.ok((await page.locator('.accepted-meanings li').allTextContents()).includes('จุดอ่อน'));
        assert.equal(await page.locator('.goal-ring strong').textContent(), '1/ 20');
        assert.equal(await page.locator('.answer-actions').isVisible(), false);
        await page.evaluate(() => document.querySelector('.translation-form').requestSubmit());
        await page.keyboard.press('2');
        assert.equal(await page.locator('.goal-ring strong').textContent(), '1/ 20', 'Duplicate submit/rating does not count twice');
        await page.locator('.next-answer').click();
        assert.equal(await page.locator('#translation-input').inputValue(), '');
        assert.equal(await page.locator('.answer-result').isVisible(), false);
        assert.equal(await page.locator('.goal-ring strong').textContent(), '1/ 20');

        await studyWord('Spicy');
        await page.locator('#translation-input').fill('ไม่เผ็ด');
        await page.locator('.check-answer').click();
        assert.equal(await page.locator('.answer-result.unmatched').isVisible(), true);
        assert.equal(await page.locator('.progress-line.practice strong').textContent(), '1 คำ');
        assert.equal(await page.locator('.goal-ring strong').textContent(), '2/ 20');
        await page.setViewportSize({ width: 320, height: 844 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Typed feedback at 320px');
        await page.reload();
        assert.equal(await page.locator('.progress-line.practice strong').textContent(), '1 คำ');
        assert.equal(await page.locator('.progress-line.known strong').textContent(), '1 คำ');
        await page.locator('.review-link').click();
        assert.equal(await page.locator('#word-display').textContent(), 'Spicy');
        await page.locator('#translation-input').fill('เผ็ด');
        await page.locator('#translation-input').press('Enter');
        assert.equal(await page.locator('.answer-result.correct').isVisible(), true);
        await page.locator('.next-answer').click();
        assert.equal(await page.locator('.flashcard .empty-state').isVisible(), true);
        assert.equal(await page.locator('.goal-ring strong').textContent(), '3/ 20');
        await studyWord('Multi-factor authentication');
        await page.locator('#translation-input').fill('การยืนยันตัวตนหลายปัจจัย');
        await page.locator('.check-answer').click();
        assert.equal(await page.locator('.answer-result.correct').isVisible(), true);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Long accepted translations at 320px');
        await page.setViewportSize({ width: 390, height: 844 });
        await page.screenshot({ path: 'artifacts/typed-answer.png', fullPage: true });
        await studyWord('Vulnerability');
        await page.locator('#translation-input').fill('<img src=x onerror=alert(1)>');
        await page.locator('.check-answer').click();
        assert.equal(await page.locator('.answer-result.unmatched').isVisible(), true);
        assert.equal(await page.locator('.card-content img').count(), 0);
        assert.deepEqual(errors, []);
        await studyWord('Brute force');
        await page.locator('#translation-input').fill('การสุ่มรหัสผ่าน');
        await page.locator('.check-answer').click();
        assert.equal(await page.locator('.answer-result.partial').isVisible(), true);
        assert.match(await page.locator('.answer-result strong').textContent(), /0.5 \/ 1/);
        assert.match(await page.locator('.answer-result p').textContent(), /ไล่ลอง/);
        const bruteId = await page.evaluate(() => EngVocab.vocabulary.find(word => word.word === 'Brute force').id);
        const getRecord = () => page.evaluate(id => JSON.parse(localStorage.getItem('wordly.progress.v1')).records[id], bruteId);
        assert.equal((await getRecord()).score, 0.5);
        assert.equal((await getRecord()).status, 'practice');
        const activityBeforeDuplicate = await page.locator('.goal-ring strong').textContent();
        await page.evaluate(() => document.querySelector('.translation-form').requestSubmit());
        assert.equal(await page.locator('.goal-ring strong').textContent(), activityBeforeDuplicate);
        await page.reload();
        assert.equal((await getRecord()).score, 0.5);
        await page.locator('[data-page="library"]').click();
        await page.locator('.search-field input').fill('Brute force');
        assert.match(await page.locator('.word-status').textContent(), /0.5/);
        await page.setViewportSize({ width: 320, height: 844 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Partial result in library on mobile');
        await page.getByRole('button', { name: 'ฝึกคำว่า Brute force', exact: true }).click();
        await page.locator('#translation-input').fill('ลองรหัสผ่านทุกความเป็นไปได้');
        await page.locator('.check-answer').click();
        assert.equal(await page.locator('.answer-result.correct').isVisible(), true);
        assert.equal(await page.locator('.answer-result.partial').count(), 0, 'Partial styling resets');
        assert.equal((await getRecord()).score, 1);
        assert.equal((await getRecord()).status, 'known');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Long corrected definition on mobile');
        assert.deepEqual(errors, []);
        for (const [english, full, partial] of [
            ['Deadline', 'เวลาสุดท้ายที่ต้องเสร็จงาน', 'วันส่ง'],
            ['Microphone', 'เป็นอุปกรณ์ที่ใช้รับเสียงเข้าคอมพิวเตอร์', 'อุปกรณ์อัดเสียง'],
            ['Method', 'ฟังก์ชั่นที่อยู่ในออบเจค', 'ฟังก์ชัน'],
            ['Firewall', 'ระบบที่กรองทราฟฟิกของเครือข่ายตามกฎ', 'กรองข้อมูล'],
            ['Minibar', 'ตู้เล็กใส่เครื่องดื่มในห้องพัก', 'ตู้เย็นเล็ก'],
            ['Waiter', 'ผู้ชายที่เสิร์ฟอาหาร', 'พนักงานเสิร์ฟ'],
            ['Receipt', 'หลักฐานที่แสดงว่าจ่ายเงินแล้ว', 'หลักฐานจ่าย'],
            ['Boarding pass', 'บัตรสำหรับขึ้นเครื่องบิน', 'ตั๋วเครื่องบิน']
        ]) {
            await studyWord(english);
            await page.locator('#translation-input').fill(partial);
            await page.locator('.check-answer').click();
            assert.equal(await page.locator('.answer-result.partial').isVisible(), true, english);
            await studyWord(english);
            await page.locator('#translation-input').fill(full);
            await page.locator('.check-answer').click();
            assert.equal(await page.locator('.answer-result.correct').isVisible(), true, english);
        }
        await studyWord('Software');
        await page.locator('#translation-input').fill('ชุดคำสั่งที่ทำให้คอมทำงาน'.normalize('NFKC'));
        await page.locator('.check-answer').click();
        assert.equal(await page.locator('.answer-result.correct').isVisible(), true, 'Thai normalization in real browser');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await studyWord('Browser');
        await page.locator('#translation-input').fill('โปรแกรมสำหรับเปิดเว็บไซต์');
        await page.locator('.check-answer').click();
        assert.equal(await page.locator('.answer-result.correct').isVisible(), true);
        const browserId = await page.evaluate(() => EngVocab.vocabulary.find(word => word.word === 'Browser').id);
        await page.reload();
        assert.equal(await page.evaluate(id => JSON.parse(localStorage.getItem('wordly.progress.v1')).records[id].score, browserId), 1);
        assert.deepEqual(errors, []);
        const restricted = await browser.newContext();
        await restricted.addInitScript(() => {
            Storage.prototype.getItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
            Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
        });
        const restrictedPage = await restricted.newPage();
        await restrictedPage.goto(url);
        await restrictedPage.locator('.reveal-button').click();
        await restrictedPage.locator('.known-button').click();
        assert.match(await restrictedPage.locator('.storage-caption').textContent(), /เก็บได้เฉพาะรอบนี้/);
        assert.equal(await restrictedPage.locator('.progress-line.known strong').textContent(), '1 คำ');
        await restricted.close();
        console.log('PASS: typed answers, synonyms, blank input, duplicate submission, safe input, answer reset, review completion, local fonts, reveal/hint, ratings, persistence, categories, library, progress, responsive layouts, and corrupt/blocked storage.');
        await context.close();
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
