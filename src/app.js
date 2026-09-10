(() => {
    const { icon, categories, vocabulary, study } = EngVocab;
    const storage = EngVocab.createStorage();
    let category = storage.state.category;
    let reviewOnly = false;
    let page = 'practice';
    let toastTimer;
    const root = document.getElementById('app');
    const header = EngVocab.createHeader({ onNavigate: navigate });
    root.append(header.element);
    const shell = document.createElement('div');
    shell.className = 'main-shell';
    shell.innerHTML = `<header class="topbar"><div class="breadcrumb">พื้นที่การเรียนรู้ ${icon('chevron')} <strong>ฝึกคำศัพท์</strong></div><div class="topbar-right"><span class="streak-badge">${icon('flame')} <span>0 วันต่อเนื่อง</span></span><span class="topbar-separator"></span><span class="topbar-message">A little better, every day.</span><span class="top-avatar">W</span></div></header><main id="main-content" class="page-content"><section id="practice-page"><div class="hero"><div><div class="greeting">${icon('sun')} พื้นที่เล็ก ๆ สำหรับการเติบโตของคุณ</div><h1>เก่งขึ้นวันละคำ<span class="accent">.</span></h1><p>ไม่ต้องรีบ ไม่ต้องเป๊ะ แค่เรียนรู้คำใหม่ในทุก ๆ วัน</p></div><div class="hero-note"><span class="hand-spark">✧</span><span>Small steps.<br><em>Big possibilities.</em></span><span class="hand-loop">↝</span></div></div><div class="study-layout"><div class="study-main"><div class="study-toolbar"><div class="mode-switch" role="group" aria-label="โหมดการฝึก"><button class="active" data-mode="all" aria-pressed="true">${icon('shuffle')} สุ่มคำศัพท์</button><button data-mode="review" aria-pressed="false">${icon('repeat')} ทบทวน <span class="review-count">0</span></button></div><label class="category-select-label"><span class="sr-only">หมวดคำศัพท์ที่ต้องการฝึก</span><select id="category-select"><option value="all">ทุกหมวดหมู่</option>${categories.map(item => `<option value="${item.id}">${item.name}</option>`).join('')}</select></label></div><div class="deck-caption"><span><i></i> <span class="deck-description"></span></span><span class="deck-count"></span></div><div class="card-mount"></div><div class="keyboard-help">${icon('info')} <span>ใช้คีย์บอร์ดได้ด้วย</span><span><kbd>Space</kbd> เฉลย</span><span><kbd>H</kbd> คำใบ้</span><span><kbd>→</kbd> ข้าม</span></div></div><div class="aside-mount"></div></div><div class="categories-mount"></div></section></main><footer class="footer"><span class="footer-brand">wordly.</span><span>เรียนรู้วันละคำ เติบโตทุกวัน</span><details class="sources"><summary>เกี่ยวกับคำศัพท์ ${icon('info')}</summary><div class="sources-content"><strong>400 คำและวลี สำหรับฝึกใช้จริง</strong><p>คัดเลือกคำ แปลไทย และเขียนคำใบ้กับประโยคตัวอย่างสำหรับเว็บนี้ ความหมายเลือกตามบริบทของแต่ละหมวด</p><span>แหล่งอ่านเพิ่มเติม</span><a href="https://learnenglish.britishcouncil.org/free-resources/vocabulary" target="_blank" rel="noopener noreferrer">British Council · คำศัพท์ทั่วไป</a><a href="https://developer.mozilla.org/en-US/docs/Glossary" target="_blank" rel="noopener noreferrer">MDN · คำศัพท์เว็บและการพัฒนา</a><a href="https://csrc.nist.gov/glossary" target="_blank" rel="noopener noreferrer">NIST · คำศัพท์ความปลอดภัย</a></div></details><span class="storage-caption">${icon('check')} บันทึกบนเบราว์เซอร์นี้</span></footer></div>`;
    root.append(shell);
    const toast = document.createElement('div');
    toast.className = 'toast'; toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite');
    root.append(toast);
    function announce(message) {
        clearTimeout(toastTimer); toast.textContent = message; toast.classList.add('visible');
        toastTimer = setTimeout(() => toast.classList.remove('visible'), 3500);
    }
    const card = EngVocab.createFlashcard({
        onAnswer(id, status, score) {
            storage.rate(id, status, score);
            refresh();
        },
        onRate(id, status) {
            storage.rate(id, status);
            announce(status === 'known' ? 'จำได้เพิ่มอีกคำแล้ว เก่งมาก!' : 'เก็บคำนี้ไว้ในรายการทบทวนแล้ว');
            refresh(); nextWord(true);
        },
        onSkip: () => nextWord(true),
        onExitReview: () => setMode(false),
        announce
    });
    const progress = EngVocab.createProgress({ onReview() { category = 'all'; storage.setCategory(category); setMode(true); navigate('practice'); }, onNavigate: navigate });
    const categoryGrid = EngVocab.createCategoryGrid({ onSelect: selectCategory });
    const library = EngVocab.createLibrary({ onStudy(word) {
        category = word.category; reviewOnly = false; storage.setCategory(category);
        navigate('practice'); refresh(); card.render(word, true);
        shell.querySelector('.study-toolbar').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } });
    const sentences = EngVocab.createSentences();
    const feedback = EngVocab.createFeedback();
    shell.querySelector('main').append(feedback.element);
    shell.querySelector('main').append(sentences.element);
    shell.querySelector('.card-mount').append(card.element);
    shell.querySelector('.aside-mount').append(progress.element);
    shell.querySelector('.categories-mount').append(categoryGrid.element);
    shell.querySelector('main').append(library.element, progress.page);
    shell.querySelector('#category-select').addEventListener('change', event => selectCategory(event.target.value));
    shell.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode === 'review')));

    function pool() { return study.pool(vocabulary, category, reviewOnly, storage.state.records); }
    function nextWord(focus = false) {
        card.render(study.random(pool(), card.currentWord?.id), focus);
    }
    function selectCategory(id) {
        category = id; storage.setCategory(id); refresh(); nextWord(true);
        shell.querySelector('.study-toolbar').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function setMode(review) { reviewOnly = review; refresh(); nextWord(true); }
    function refresh() {
        const { records, activity } = storage.state;
        const categoryWords = study.pool(vocabulary, category, false, records);
        const counts = study.counts(categoryWords, records);
        shell.querySelector('#category-select').value = category;
        shell.querySelector('.review-count').textContent = counts.practice;
        shell.querySelector('.deck-description').textContent = reviewOnly ? 'ฝึกซ้ำอีกนิด ให้จำได้ขึ้นใจ' : category === 'all' ? 'เปิดโลกคำศัพท์จากทุกหมวด' : categories.find(item => item.id === category).description;
        shell.querySelector('.deck-count').textContent = `${pool().length} คำในชุดนี้`;
        shell.querySelectorAll('[data-mode]').forEach(button => {
            const active = (button.dataset.mode === 'review') === reviewOnly;
            button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
        });
        shell.querySelector('.streak-badge span').textContent = `${study.streak(activity)} วันต่อเนื่อง`;
        shell.querySelector('.storage-caption').innerHTML = storage.persistent ? `${icon('check')} บันทึกบนเบราว์เซอร์นี้` : `${icon('info')} เก็บได้เฉพาะรอบนี้ · เบราว์เซอร์ไม่อนุญาตให้บันทึก`;
        progress.update(storage.state); categoryGrid.update(category, records); library.update(records);
    }
    function navigate(nextPage, scroll = true) {
        page = ['practice', 'library', 'progress', 'sentences', 'feedback'].includes(nextPage) ? nextPage : 'practice';
        header.update(page);
        shell.querySelector('#practice-page').hidden = page !== 'practice';
        sentences.element.hidden = page !== 'sentences';
        feedback.element.hidden = page !== 'feedback';
        library.element.hidden = page !== 'library'; progress.page.hidden = page !== 'progress';
        const title = { practice: 'ฝึกคำศัพท์', library: 'คลังคำศัพท์', progress: 'ความคืบหน้า', sentences: 'แต่งประโยค', feedback: 'แนะนำ / แจ้งปัญหา' }[page];
        shell.querySelector('.breadcrumb strong').textContent = title;
        document.title = `${title} · Wordly`;
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        refresh();
        if (location.hash !== `#${page}`) location.hash = page;
        if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.addEventListener('hashchange', () => { if (location.hash.slice(1) !== page) navigate(location.hash.slice(1)); });
    document.addEventListener('keydown', event => {
        if (page !== 'practice' || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
        if (event.target.closest('input, select, textarea, [contenteditable="true"], summary')) return;
        const key = event.key.toLowerCase();
        if (key === ' ' && event.target.closest('button, a')) return;
        if (key === ' ') { event.preventDefault(); card.reveal(); }
        else if (key === 'h') card.hint();
        else if (key === '1') card.rate('practice');
        else if (key === '2') card.rate('known');
        else if (key === 'arrowright') { event.preventDefault(); nextWord(true); }
    });
    navigate(location.hash.slice(1) || 'practice', false); nextWord();
    // Refresh daily totals when the app is reopened or crosses midnight.
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
    setInterval(() => { if (!document.hidden) refresh(); }, 60000);
})();
