EngVocab.createCategoryGrid = function ({ onSelect }) {
    const { icon, categories, vocabulary, study } = EngVocab;
    const element = document.createElement('section');
    element.className = 'category-section';
    element.innerHTML = `<div class="section-heading"><div><h2>เลือกโลกที่อยากเรียนรู้ <span>8 หมวดหมู่</span></h2><p>คำศัพท์ที่ใช้ได้จริง ในเรื่องที่ใกล้ตัวคุณ</p></div><button class="text-button all-categories">สุ่มทุกหมวด ${icon('arrow')}</button></div><div class="category-grid"></div>`;
    const grid = element.querySelector('.category-grid');
    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'category-card'; button.dataset.category = category.id;
        button.style.setProperty('--category-color', category.color);
        button.innerHTML = `<div class="category-card-top"><span class="category-icon">${icon(category.icon)}</span><span class="category-count">50 คำ</span></div><h3>${category.name}</h3><p lang="en">${category.english}</p><div class="category-progress"><div><span></span></div><small></small></div>`;
        button.addEventListener('click', () => onSelect(category.id)); grid.append(button);
    });
    element.querySelector('.all-categories').addEventListener('click', () => onSelect('all'));
    return {
        element,
        update(category, records) {
            grid.querySelectorAll('button').forEach(button => {
                const words = vocabulary.filter(word => word.category === button.dataset.category);
                const { known } = study.counts(words, records);
                const selected = category === button.dataset.category;
                button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
                button.querySelector('.category-progress span').style.width = `${known / words.length * 100}%`;
                button.querySelector('small').textContent = `จำได้ ${known}/${words.length}`;
            });
        }
    };
};
