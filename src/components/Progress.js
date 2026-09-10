EngVocab.createProgress = function ({ onReview, onNavigate }) {
    const { icon, vocabulary, categories, study } = EngVocab;
    const element = document.createElement('aside');
    element.className = 'study-aside';
    element.innerHTML = `
        <section class="daily-goal panel"><div class="panel-heading"><h2>เป้าหมายวันนี้</h2><span class="small-icon">${icon('target')}</span></div><div class="goal-ring" role="img"><div><strong>0<span>/ 20</span></strong><small>ครั้งที่ฝึกวันนี้</small></div></div><p class="goal-message"></p><span class="goal-caption">แค่วันละ 20 ครั้ง ค่อย ๆ สะสมความมั่นใจ</span></section>
        <section class="mini-progress panel"><div class="panel-heading"><h2>คำศัพท์ของคุณ</h2><button class="icon-button progress-link" aria-label="ดูความคืบหน้าทั้งหมด">${icon('arrow')}</button></div><div class="progress-line known"><span><i></i> จำได้แล้ว</span><strong></strong></div><div class="progress-line practice"><span><i></i> ต้องทบทวน</span><strong></strong></div><div class="progress-line unseen"><span><i></i> ยังไม่ได้ลอง</span><strong></strong></div><div class="stacked-progress" aria-hidden="true"><span class="known-segment"></span><span class="practice-segment"></span></div><button class="review-link">${icon('repeat')} ทบทวนคำที่ยังจำไม่ได้ ${icon('chevron')}</button></section>
        <section class="tip-card"><span>${icon('bulb')} LITTLE LEARNING TIP</span><p>ลองพูดคำนั้นออกเสียง<br>แล้วแต่งประโยคของตัวเอง<br>สักหนึ่งประโยคดูสิ</p><small>คำเล็ก ๆ ที่ได้ใช้ จะจำได้นานขึ้น</small></section>`;
    element.querySelector('.review-link').addEventListener('click', onReview);
    element.querySelector('.progress-link').addEventListener('click', () => onNavigate('progress'));
    const page = document.createElement('section');
    page.className = 'progress-page';
    page.innerHTML = `<div class="page-intro"><span class="eyebrow">YOUR LEARNING JOURNEY</span><h1>ทุกคำที่ฝึก คือความก้าวหน้า<span class="accent">.</span></h1><p>มองย้อนดูสิ่งที่ทำได้ แล้วค่อย ๆ ก้าวต่อในแบบของคุณ</p></div><div class="stats-grid"></div><div class="progress-details"><section class="panel weekly-panel"><div class="panel-heading"><h2>จังหวะการเรียนรู้ของคุณ</h2><span>7 วันที่ผ่านมา</span></div><div class="weekly-chart"></div><p>นับทุกครั้งที่เลือก “จำได้แล้ว” หรือ “ยังจำไม่ได้” รวมการฝึกคำเดิมซ้ำ</p></section><section class="panel progress-summary"><span class="summary-icon">${icon('leaf')}</span><h2>ความสม่ำเสมอ เริ่มที่วันนี้</h2><p class="streak-description"></p><button class="primary continue-practice">กลับไปฝึกคำศัพท์ ${icon('arrow')}</button></section></div><section class="panel category-breakdown"><div class="panel-heading"><h2>ความคืบหน้าแต่ละหมวด</h2><span>อิงจากคำที่จำได้ล่าสุด</span></div><div class="breakdown-list"></div></section>`;
    page.querySelector('.continue-practice').addEventListener('click', () => onNavigate('practice'));
    return {
        element, page,
        update({ records, activity }) {
            const counts = study.counts(vocabulary, records);
            const today = activity[study.dayKey()] || 0;
            const streak = study.streak(activity);
            const ring = element.querySelector('.goal-ring');
            ring.style.setProperty('--progress', `${Math.min(today / 20, 1) * 360}deg`);
            ring.setAttribute('aria-label', `วันนี้ฝึก ${today} ครั้ง จากเป้าหมาย 20 ครั้ง`);
            ring.querySelector('strong').innerHTML = `${today}<span>/ 20</span>`;
            element.querySelector('.goal-message').textContent = today >= 20 ? 'ถึงเป้าหมายแล้ว เก่งมากเลย!' : today === 0 ? 'คำแรกของวันนี้ รอคุณอยู่' : `อีก ${20 - today} ครั้ง ก็ถึงเป้าหมายแล้ว`;
            for (const name of ['known', 'practice', 'unseen']) element.querySelector(`.progress-line.${name} strong`).textContent = `${counts[name]} คำ`;
            element.querySelector('.known-segment').style.width = `${counts.known / counts.total * 100}%`;
            element.querySelector('.practice-segment').style.width = `${counts.practice / counts.total * 100}%`;
            page.querySelector('.stats-grid').innerHTML = [
                ['book', 'คำศัพท์ทั้งหมด', counts.total, 'คำใน 8 หมวด', 'blue'],
                ['check', 'จำได้แล้ว', counts.known, `${Math.round(counts.known / counts.total * 100)}% ของคำทั้งหมด`, 'green'],
                ['repeat', 'ต้องทบทวน', counts.practice, 'ค่อย ๆ ฝึกอีกครั้งได้เสมอ', 'orange'],
                ['flame', 'ฝึกต่อเนื่อง', streak, 'วันติดต่อกัน', 'purple']
            ].map(([symbol, label, value, caption, color]) => `<div class="stat-card"><span class="stat-icon ${color}">${icon(symbol)}</span><span>${label}</span><strong>${value}</strong><small>${caption}</small></div>`).join('');
            const days = study.recentDays(activity);
            const max = Math.max(20, ...days.map(day => day.count));
            page.querySelector('.weekly-chart').innerHTML = days.map((day, i) => `<div class="chart-column ${i === 6 ? 'today' : ''}" aria-label="${day.key}: ${day.count} ครั้ง"><strong>${day.count}</strong><div class="bar-track"><span style="height:${Math.max(3, day.count / max * 100)}%"></span></div><small>${day.label}</small></div>`).join('');
            page.querySelector('.streak-description').textContent = streak ? `คุณกลับมาฝึกต่อเนื่อง ${streak} วันแล้ว รักษาจังหวะเล็ก ๆ นี้ต่อไปนะ` : 'ยังไม่มีวันฝึกต่อเนื่อง เริ่มจากคำแรกวันนี้ แล้วพรุ่งนี้กลับมาเจอกันอีกนะ';
            page.querySelector('.breakdown-list').innerHTML = categories.map(category => {
                const count = study.counts(vocabulary.filter(word => word.category === category.id), records);
                return `<div class="breakdown-row" style="--category-color:${category.color}"><span class="category-icon">${icon(category.icon)}</span><div class="breakdown-name"><strong>${category.name}</strong><small>${category.english}</small></div><div class="breakdown-track"><span style="width:${count.known / count.total * 100}%"></span></div><span>${count.known}/${count.total} คำ</span></div>`;
            }).join('');
        }
    };
};
