EngVocab.createHeader = function ({ onNavigate }) {
    const { icon } = EngVocab;
    const element = document.createElement('aside');
    element.className = 'sidebar';
    element.innerHTML = `
        <a class="brand" href="#practice" aria-label="Wordly หน้าฝึกคำศัพท์"><span class="brand-mark">w<span>·</span></span><span>wordly<span class="brand-dot">.</span></span></a>
        <div class="sidebar-caption">YOUR LITTLE ENGLISH SPACE</div>
        <nav class="navigation" aria-label="เมนูหลัก">
            <span class="nav-label">พื้นที่การเรียนรู้</span>
            <button class="nav-item active" data-page="practice">${icon('cards')}<span>ฝึกคำศัพท์</span><span class="nav-dot"></span></button>
            <button class="nav-item" data-page="library">${icon('book')}<span>คลังคำศัพท์</span><span class="nav-count">400</span></button>
            <button class="nav-item" data-page="sentences">${icon('book')}<span>แต่งประโยค</span></button>
            <button class="nav-item" data-page="progress">${icon('chart')}<span>ความคืบหน้า</span></button>
            <button class="nav-item" data-page="feedback">${icon('info')}<span>แนะนำ / แจ้งปัญหา</span></button>
        </nav>
        <div class="sidebar-bottom"><div class="little-note"><span class="note-icon">${icon('leaf')}</span><p>วันละนิด ก็เก่งขึ้นได้</p><span>ไม่ต้องจำได้ทุกคำในวันเดียว<br>แค่กลับมาเรียนรู้ทุกวันก็พอ</span><div class="note-dots"><i></i><i></i><i></i><i></i><i></i></div></div><div class="local-profile"><span class="avatar">${icon('sun')}</span><div><strong>พื้นที่เรียนรู้ของคุณ</strong><span>เติบโตในจังหวะของตัวเอง</span></div></div></div>`;
    element.querySelector('.brand').addEventListener('click', event => { event.preventDefault(); onNavigate('practice'); });
    element.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => onNavigate(button.dataset.page)));
    return {
        element,
        update(page) {
            element.querySelectorAll('[data-page]').forEach(button => {
                const active = button.dataset.page === page;
                button.classList.toggle('active', active);
                if (active) button.setAttribute('aria-current', 'page');
                else button.removeAttribute('aria-current');
            });
        }
    };
};
