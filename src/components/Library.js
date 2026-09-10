EngVocab.createLibrary = function ({ onStudy }) {
    const { vocabulary, categories, icon } = EngVocab;
    let records = {};
    let pageNumber = 1;
    const pageSize = 20;
    const element = document.createElement('section');
    element.className = 'library-page';
    element.innerHTML = `<div class="page-intro"><span class="eyebrow">A WORLD OF WORDS</span><h1>คลังคำศัพท์ของคุณ<span class="accent">.</span></h1><p>400 คำและวลีใน 8 หมวด ค้นพบคำที่อยากใช้ แล้วเริ่มฝึกได้เลย</p></div><div class="library-tools"><label class="search-field">${icon('search')}<input type="search" placeholder="ค้นหาคำศัพท์หรือความหมายภาษาไทย…" aria-label="ค้นหาคำศัพท์หรือความหมายภาษาไทย"></label><select class="library-category" aria-label="หมวดในคลังคำศัพท์"><option value="all">ทุกหมวดหมู่</option>${categories.map(category => `<option value="${category.id}">${category.name}</option>`).join('')}</select><select class="library-status" aria-label="สถานะคำศัพท์"><option value="all">ทุกสถานะ</option><option value="known">จำได้แล้ว</option><option value="practice">ต้องทบทวน</option><option value="unseen">ยังไม่ได้ลอง</option></select></div><div class="library-results" role="status"></div><div class="word-list"></div><div class="library-empty empty-state" hidden>${icon('search')}<h2>ยังไม่พบคำที่ค้นหา</h2><p>ลองใช้คำสั้นลง หรือเปลี่ยนหมวดและสถานะ</p><button class="secondary clear-filters">ล้างตัวกรอง</button></div><div class="pagination"><button class="secondary previous-page">ก่อนหน้า</button><span></span><button class="secondary next-page">ถัดไป ${icon('arrow')}</button></div>`;
    const search = element.querySelector('input');
    const categorySelect = element.querySelector('.library-category');
    const statusSelect = element.querySelector('.library-status');
    const list = element.querySelector('.word-list');
    const labels = { known: 'จำได้แล้ว', practice: 'ต้องทบทวน', unseen: 'ยังไม่ได้ลอง' };
    function render() {
        const query = search.value.trim().toLocaleLowerCase();
        const filtered = vocabulary.filter(word => {
            const status = records[word.id]?.status || 'unseen';
            return (categorySelect.value === 'all' || word.category === categorySelect.value)
                && (statusSelect.value === 'all' || status === statusSelect.value)
                && `${word.word} ${word.translations.join(' ')} ${(word.answerAliases || []).join(' ')}`.toLocaleLowerCase().includes(query);
        });
        const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
        pageNumber = Math.min(pageNumber, totalPages);
        element.querySelector('.library-results').textContent = `พบ ${filtered.length} คำ จากทั้งหมด ${vocabulary.length} คำ`;
        list.replaceChildren();
        filtered.slice((pageNumber - 1) * pageSize, pageNumber * pageSize).forEach(word => {
            const status = records[word.id]?.status || 'unseen';
            const row = document.createElement('article');
            row.className = 'word-row';
            row.innerHTML = `<div class="library-word"><h2 lang="en"></h2><span></span></div><div class="library-meaning"><p></p><small></small></div><span class="word-status ${status}">${labels[status]}</span><button class="icon-button" aria-label="ฝึกคำนี้">${icon('arrow')}</button>`;
            row.querySelector('h2').textContent = word.word;
            if (records[word.id]?.score === 0.5) row.querySelector('.word-status').textContent = 'เข้าใจบางส่วน · 0.5/1 · ทบทวน';
            row.querySelector('.library-word span').textContent = word.partOfSpeech;
            row.querySelector('p').textContent = word.meaning;
            const alternatives = document.createElement('div');
            alternatives.className = 'library-alternatives';
            alternatives.textContent = `แปลได้ว่า: ${word.translations.slice(1).join(' · ')}`;
            row.querySelector('.library-meaning').append(alternatives);
            row.querySelector('small').textContent = word.categoryName;
            row.querySelector('button').setAttribute('aria-label', `ฝึกคำว่า ${word.word}`);
            row.querySelector('button').addEventListener('click', () => onStudy(word));
            list.append(row);
        });
        element.querySelector('.library-empty').hidden = filtered.length > 0;
        element.querySelector('.pagination').hidden = !filtered.length;
        element.querySelector('.pagination span').textContent = `หน้า ${pageNumber} / ${totalPages}`;
        element.querySelector('.previous-page').disabled = pageNumber === 1;
        element.querySelector('.next-page').disabled = pageNumber === totalPages;
    }
    [search, categorySelect, statusSelect].forEach(input => input.addEventListener(input === search ? 'input' : 'change', () => { pageNumber = 1; render(); }));
    element.querySelector('.clear-filters').addEventListener('click', () => {
        search.value = ''; categorySelect.value = 'all'; statusSelect.value = 'all'; pageNumber = 1; render(); search.focus();
    });
    element.querySelector('.previous-page').addEventListener('click', () => { pageNumber--; render(); });
    element.querySelector('.next-page').addEventListener('click', () => { pageNumber++; render(); });
    return { element, update(nextRecords) { records = nextRecords; render(); } };
};
