EngVocab.createFlashcard = function ({ onRate, onAnswer, onSkip, onExitReview, announce }) {
    const { icon } = EngVocab;
    let currentWord = null;
    let revealed = false;
    let submitted = false;
    let composing = false;
    let speechId = 0;
    const element = document.createElement('section');
    element.className = 'flashcard';
    element.setAttribute('aria-label', 'การ์ดฝึกคำศัพท์');
    element.innerHTML = `
        <div class="card-content">
            <div class="card-top"><span class="word-category"></span><span class="card-label">ENGLISH → THAI</span></div>
            <div class="question-area"><span class="eyebrow">รู้จักคำนี้ไหม?</span><div class="word-heading"><h2 id="word-display" lang="en" tabindex="-1"></h2><button class="sound-button" aria-label="ฟังการออกเสียง">${icon('sound')}</button></div><span class="word-pos" lang="en"></span><div class="hint-area"><button class="hint-button" aria-expanded="false" aria-controls="hint-text">${icon('bulb')} ขอคำใบ้ <kbd>H</kbd></button><p id="hint-text" class="hint-text" hidden></p></div></div>
            <form class="translation-form" novalidate>
                <label for="translation-input">คำนี้แปลว่าอะไร?</label>
                <p id="translation-help">แปลหรืออธิบายความหมายตามหมวดด้วยคำของคุณ · ถูก 1 คะแนน / เข้าใจบางส่วน 0.5 คะแนน</p>
                <div class="translation-controls"><input id="translation-input" name="translation" type="text" lang="th" placeholder="พิมพ์คำแปลของคุณ…" maxlength="250" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" aria-describedby="translation-help translation-error"><button type="submit" class="primary check-answer">ตรวจคำตอบ ${icon('check')}</button></div>
                <p id="translation-error" class="input-error" role="alert" hidden></p>
            </form>
            <div class="answer-result" role="status" aria-live="polite" tabindex="-1" hidden><strong></strong><p></p></div>
            <div class="answer-area" hidden><div class="answer-divider"><span>ความหมายในหมวดนี้</span></div><h3 class="meaning"></h3><div class="accepted-meanings"><h4>คำแปลที่รับได้</h4><ul></ul><p>เลือกตอบเพียงความหมายเดียวก็ได้ · คำนี้อาจมีความหมายอื่นเมื่อใช้ต่างบริบท</p></div><div class="example"><span>ลองใช้ในประโยค</span><p lang="en"></p></div></div>
            <div class="question-actions"><p class="card-prompt">ยังนึกไม่ออก? ดูความหมายแล้วลองจำไปด้วยกัน</p><button class="secondary reveal-button">${icon('eye')} เปิดเฉลย <kbd>Space</kbd></button></div>
            <div class="answer-actions" hidden><p class="card-prompt">คำนี้เป็นยังไงบ้าง? เลือกตามที่จำได้จริง ๆ เลย</p><div class="rating-buttons"><button class="practice-button">${icon('repeat')} ยังจำไม่ได้ <kbd>1</kbd></button><button class="known-button">${icon('check')} จำได้แล้ว <kbd>2</kbd></button></div></div>
            <div class="submitted-actions" hidden><p>บันทึกผลครั้งนี้แล้ว</p><button class="primary next-answer">คำถัดไป ${icon('arrow')}</button></div>
            <div class="card-bottom"><span>${icon('shuffle')} สุ่มคำใหม่ทุกครั้ง</span><button class="skip-button">ข้ามคำนี้ ${icon('arrow')}</button></div>
        </div>
        <div class="empty-state" hidden><span class="empty-icon">${icon('check')}</span><h2>ไม่มีคำที่ต้องทบทวนในหมวดนี้</h2><p>เริ่มฝึกแล้วเลือก “ยังจำไม่ได้”<br>คำเหล่านั้นจะกลับมาให้ทบทวนตรงนี้</p><button class="primary exit-review">กลับไปฝึกทุกคำ ${icon('arrow')}</button></div>`;
    const get = selector => element.querySelector(selector);
    const sound = get('.sound-button');
    const input = get('#translation-input');
    function hint() {
        if (!currentWord || revealed || !get('#hint-text').hidden) return;
        get('#hint-text').textContent = currentWord.hint;
        get('#hint-text').hidden = false;
        get('.hint-button').setAttribute('aria-expanded', 'true');
        get('.hint-button').classList.add('hint-open');
    }
    function reveal(fromSubmission = false) {
        if (!currentWord || revealed) return;
        revealed = true;
        get('.meaning').textContent = currentWord.meaning;
        const meanings = get('.accepted-meanings ul');
        meanings.replaceChildren();
        currentWord.translations.forEach(translation => {
            const item = document.createElement('li'); item.textContent = translation; meanings.append(item);
        });
        get('.example p').textContent = currentWord.example;
        get('.answer-area').hidden = false;
        get('.answer-actions').hidden = fromSubmission;
        get('.question-actions').hidden = true;
        get('.hint-area').hidden = true;
        get('.translation-form').hidden = !fromSubmission;
        element.classList.add('is-revealed');
        if (!fromSubmission) get('.practice-button').focus({ preventScroll: true });
    }
    function submit(event) {
        event.preventDefault();
        if (!currentWord || revealed || submitted || composing) return;
        const result = EngVocab.answers.check(currentWord, input.value);
        if (result.status === 'empty') {
            get('#translation-error').textContent = 'พิมพ์คำแปลก่อนตรวจคำตอบ หรือกดเปิดเฉลยได้เลย';
            get('#translation-error').hidden = false;
            input.setAttribute('aria-invalid', 'true'); input.focus(); return;
        }
        submitted = true;
        const correct = result.status === 'correct';
        const partial = result.status === 'partial';
        input.readOnly = true;
        get('.check-answer').disabled = true;
        get('#translation-error').hidden = true;
        input.removeAttribute('aria-invalid');
        reveal(true);
        const feedback = get('.answer-result');
        feedback.hidden = false; feedback.classList.toggle('correct', correct);
        feedback.classList.toggle('partial', partial);
        feedback.classList.toggle('unmatched', !correct && !partial);
        feedback.querySelector('strong').textContent = correct ? 'แปลถูกแล้ว! · 1 / 1 คะแนน' : partial ? 'เข้าใจถูกบางส่วน · 0.5 / 1 คะแนน' : 'ยังไม่ตรงกับคำแปลที่รองรับ · 0 / 1 คะแนน';
        feedback.querySelector('p').textContent = correct ? 'คำตอบนี้ตรงกับความหมายในหมวดนี้ เก็บเป็นคำที่จำได้แล้ว' : partial ? `${result.explanation} · เก็บไว้ทบทวนอีกครั้งเพื่อให้เข้าใจครบ` : 'ลองเทียบกับคำแปลด้านล่างนะ เราเก็บคำนี้ไว้ทบทวนแล้ว ระบบตรวจจากคำเทียบและรูปแบบความหมายที่เตรียมไว้ จึงอาจยังไม่รองรับบางสำนวนที่ถูกต้อง';
        get('.submitted-actions').hidden = false;
        onAnswer(currentWord.id, correct ? 'known' : 'practice', result.score);
        feedback.focus({ preventScroll: true });
    }
    function rate(status) {
        if (!currentWord || !revealed || submitted) return;
        revealed = false; onRate(currentWord.id, status);
    }
    sound.addEventListener('click', () => {
        if (!currentWord || !('speechSynthesis' in window)) return;
        const requestId = ++speechId;
        window.speechSynthesis.cancel();
        const speech = new SpeechSynthesisUtterance(currentWord.word);
        speech.lang = 'en-US'; speech.rate = 0.85;
        const voice = window.speechSynthesis.getVoices().find(item => item.lang === 'en-US') || window.speechSynthesis.getVoices().find(item => item.lang.startsWith('en'));
        if (voice) speech.voice = voice;
        sound.classList.add('speaking');
        speech.onend = () => { if (requestId === speechId) sound.classList.remove('speaking'); };
        speech.onerror = event => {
            if (requestId !== speechId) return;
            sound.classList.remove('speaking');
            if (!['canceled', 'interrupted'].includes(event.error)) announce('อุปกรณ์นี้ยังเล่นเสียงไม่ได้ ลองตรวจสอบเสียงภาษาอังกฤษของเบราว์เซอร์');
        };
        window.speechSynthesis.speak(speech);
    });
    if (!('speechSynthesis' in window)) { sound.disabled = true; sound.title = 'เบราว์เซอร์นี้ไม่รองรับการออกเสียง'; }
    get('.hint-button').addEventListener('click', hint);
    get('.reveal-button').addEventListener('click', () => reveal());
    get('.translation-form').addEventListener('submit', submit);
    input.addEventListener('compositionstart', () => { composing = true; });
    input.addEventListener('compositionend', () => { composing = false; });
    input.addEventListener('input', () => { input.removeAttribute('aria-invalid'); get('#translation-error').hidden = true; });
    get('.next-answer').addEventListener('click', onSkip);
    get('.practice-button').addEventListener('click', () => rate('practice'));
    get('.known-button').addEventListener('click', () => rate('known'));
    get('.skip-button').addEventListener('click', onSkip);
    get('.exit-review').addEventListener('click', onExitReview);
    return {
        element, hint, reveal, rate,
        get currentWord() { return currentWord; },
        render(word, focus = false) {
            currentWord = word; revealed = false; submitted = false; composing = false; speechId++;
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
            sound.classList.remove('speaking');
            get('.card-content').hidden = !word;
            get('.empty-state').hidden = Boolean(word);
            element.classList.remove('is-revealed');
            if (!word) return;
            input.value = ''; input.readOnly = false; input.removeAttribute('aria-invalid');
            get('.check-answer').disabled = false;
            get('.translation-form').hidden = false;
            get('#translation-error').hidden = true;
            get('.answer-result').hidden = true;
            get('.answer-result strong').textContent = ''; get('.answer-result p').textContent = '';
            get('.submitted-actions').hidden = true;
            get('.accepted-meanings ul').replaceChildren();
            const category = EngVocab.categories.find(item => item.id === word.category);
            get('.word-category').innerHTML = `${icon(category.icon)}<span>${category.name}</span>`;
            get('#word-display').textContent = word.word;
            get('.word-pos').textContent = word.partOfSpeech;
            get('#hint-text').hidden = true; get('#hint-text').textContent = '';
            get('.hint-button').setAttribute('aria-expanded', 'false');
            get('.hint-button').classList.remove('hint-open');
            get('.hint-area').hidden = false; get('.answer-area').hidden = true;
            get('.meaning').textContent = ''; get('.example p').textContent = '';
            get('.answer-actions').hidden = true; get('.question-actions').hidden = false;
            if (focus) get('#word-display').focus({ preventScroll: true });
        }
    };
};
