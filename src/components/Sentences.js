EngVocab.createSentences = function () {
    const element = document.createElement('section');
    element.id = 'sentences-page';
    element.hidden = true;
    let mode = 'easy';
    const positions = { easy: 0, hard: 0 };
    let selected = [], words = [], solved = false;
    const current = () => EngVocab.sentences[positions[mode]];
    element.innerHTML = `<div class="hero"><div><div class="greeting">ต่อคำเป็นประโยค ทีละนิดทุกวัน</div><h1>ฝึกแต่งประโยค<span class="accent">.</span></h1><p>อ่านโจทย์ภาษาไทย แล้วลองแต่งเป็นภาษาอังกฤษ</p></div></div>
        <div class="sentence-toolbar"><div class="mode-switch" role="group" aria-label="ระดับการแต่งประโยค"><button data-level="easy">ง่าย · เรียงคำ</button><button data-level="hard">ยาก · พิมพ์เอง</button></div><span class="sentence-count"></span></div>
        <div class="sentence-card"><p class="sentence-instruction"></p><h2 class="sentence-question" tabindex="-1"></h2>
        <form class="sentence-form"><div class="sentence-easy"><p id="sentence-order-label">ประโยคของคุณ · กดคำเพื่อเอาออก</p><div class="sentence-selected" role="group" aria-labelledby="sentence-order-label"></div><p id="sentence-bank-label">คำศัพท์ที่ให้ · กดเพื่อเรียงคำ</p><div class="sentence-bank" role="group" aria-labelledby="sentence-bank-label"></div></div>
        <div class="sentence-hard"><label for="sentence-input">ประโยคภาษาอังกฤษของคุณ</label><textarea id="sentence-input" rows="3" lang="en" placeholder="เขียนประโยคภาษาอังกฤษที่นี่…" spellcheck="false" autocapitalize="sentences"></textarea><p class="sentence-note">ตรวจเทียบกับคำตอบที่เตรียมไว้ ประโยคที่ถูกต้องรูปแบบอื่นอาจยังไม่อยู่ในชุดคำตอบ</p></div>
        <div class="sentence-actions"><button type="submit" class="sentence-primary sentence-check">ตรวจคำตอบ</button><button type="button" class="sentence-clear">เริ่มเรียง / พิมพ์ใหม่</button><button type="button" class="sentence-hint-button" aria-expanded="false" aria-controls="sentence-hint">ขอคำใบ้</button><button type="button" class="sentence-reveal">ดูเฉลย</button></div></form>
        <p id="sentence-hint" class="sentence-hint" hidden></p><p class="sentence-feedback" role="status" aria-live="polite"></p><div class="sentence-solution" hidden><strong>ตัวอย่างคำตอบ</strong><p lang="en"></p><small></small></div>
        <div class="sentence-bottom"><span>ลองเองก่อน หรือเปิดคำใบ้ได้ทุกเมื่อ</span><button type="button" class="sentence-next">ข้อต่อไป →</button></div></div>`;
    const find = selector => element.querySelector(selector);
    function feedback(message = '', correct = false) {
        find('.sentence-feedback').textContent = message;
        find('.sentence-feedback').classList.toggle('correct', correct);
    }
    function drawWords() {
        const bank = find('.sentence-bank'), answer = find('.sentence-selected');
        bank.replaceChildren(); answer.replaceChildren();
        if (!selected.length) { const placeholder = document.createElement('span'); placeholder.textContent = 'กดคำด้านล่างเพื่อเริ่มแต่งประโยค'; answer.append(placeholder); }
        words.forEach((word, id) => {
            const button = document.createElement('button');
            button.type = 'button'; button.className = 'sentence-word'; button.textContent = word;
            button.disabled = solved || selected.includes(id);
            button.addEventListener('click', () => { selected.push(id); feedback(); drawWords(); });
            bank.append(button);
        });
        selected.forEach(id => {
            const button = document.createElement('button');
            button.type = 'button'; button.className = 'sentence-word'; button.textContent = words[id];
            button.setAttribute('aria-label', `เอาคำ ${words[id]} ออก`); button.disabled = solved;
            button.addEventListener('click', () => { selected = selected.filter(value => value !== id); feedback(); drawWords(); });
            answer.append(button);
        });
    }
    function render(focus = false) {
        selected = []; solved = false;
        words = current().answer.split(' ');
        for (let i = words.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [words[i], words[j]] = [words[j], words[i]]; }
        if (words.join(' ') === current().answer) words.push(words.shift());
        element.querySelectorAll('[data-level]').forEach(button => { const active = button.dataset.level === mode; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
        find('.sentence-count').textContent = `ข้อ ${positions[mode] + 1} / ${EngVocab.sentences.length}`;
        find('.sentence-question').textContent = current().thai;
        find('.sentence-instruction').textContent = mode === 'easy' ? 'เรียงคำที่ให้เป็นประโยคภาษาอังกฤษให้ถูกต้อง' : 'แต่งประโยคภาษาอังกฤษจากความหมายภาษาไทยด้วยตัวเอง';
        find('.sentence-easy').hidden = mode !== 'easy'; find('.sentence-hard').hidden = mode !== 'hard';
        find('#sentence-input').value = ''; find('#sentence-input').disabled = false;
        find('.sentence-check').disabled = false;
        find('#sentence-hint').hidden = true; find('#sentence-hint').textContent = current().hint;
        find('.sentence-hint-button').setAttribute('aria-expanded', 'false');
        find('.sentence-solution').hidden = true; feedback(); drawWords();
        if (focus) find('.sentence-question').focus();
    }
    function finish() { solved = true; find('#sentence-input').disabled = true; find('.sentence-check').disabled = true; drawWords(); }
    element.querySelectorAll('[data-level]').forEach(button => button.addEventListener('click', () => { if (mode !== button.dataset.level) { mode = button.dataset.level; render(); } }));
    find('.sentence-form').addEventListener('submit', event => {
        event.preventDefault(); if (solved) return;
        const value = mode === 'easy' ? selected.map(id => words[id]).join(' ') : find('#sentence-input').value;
        if (!value.trim()) return feedback('ลองใส่คำตอบก่อนตรวจนะ');
        if (mode === 'easy' && selected.length !== words.length) return feedback('ลองเรียงคำที่ให้ให้ครบทุกคำก่อนนะ');
        if (EngVocab.sentenceAnswers.check(current(), value)) { feedback('ถูกต้อง! แต่งประโยคได้ดีมาก ไปข้อต่อไปได้เลย', true); finish(); }
        else feedback(mode === 'easy' ? 'ลำดับคำยังไม่ตรง ลองเรียงใหม่ หรือเปิดคำใบ้ได้เลย' : 'ยังไม่ตรงกับคำตอบที่เตรียมไว้ ลองตรวจไวยากรณ์และความหมาย หรือดูเฉลยเพื่อเปรียบเทียบ');
    });
    find('#sentence-input').addEventListener('input', () => feedback());
    find('.sentence-clear').addEventListener('click', () => render());
    find('.sentence-hint-button').addEventListener('click', () => { const hint = find('#sentence-hint'); hint.hidden = !hint.hidden; find('.sentence-hint-button').setAttribute('aria-expanded', String(!hint.hidden)); });
    find('.sentence-reveal').addEventListener('click', () => {
        find('.sentence-solution').hidden = false;
        find('.sentence-solution p').textContent = current().answer;
        find('.sentence-solution small').textContent = current().hint;
        if (!solved) feedback('ดูตัวอย่างแล้ว ลองฝึกประโยคนี้ใหม่ได้ด้วยปุ่มเริ่มใหม่');
        finish();
    });
    find('.sentence-next').addEventListener('click', () => { positions[mode] = (positions[mode] + 1) % EngVocab.sentences.length; render(true); });
    render();
    return { element };
};
