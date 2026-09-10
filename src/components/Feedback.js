EngVocab.createFeedback = function () {
    const element = document.createElement('section');
    element.id = 'feedback-page'; element.hidden = true;
    element.innerHTML = `<div class="hero"><div><div class="greeting">ช่วยให้ Wordly ดีขึ้นไปด้วยกัน</div><h1>ความคิดเห็นของคุณ<span class="accent">.</span></h1><p>อยากให้เพิ่มอะไร พบปัญหาตรงไหน หรือมีคำแนะนำ บอกเราได้เลย</p></div></div>
        <form class="feedback-form sentence-card">
            <label for="feedback-type">เรื่องที่อยากบอก</label>
            <select id="feedback-type" name="type"><option value="suggestion">แนะนำฟีเจอร์เพิ่มเติม</option><option value="bug">แจ้งปัญหาการใช้งาน</option><option value="content">แนะนำ / แก้ไขเนื้อหาบทเรียน</option><option value="other">ความคิดเห็นอื่น ๆ</option></select>
            <label for="feedback-name">ชื่อหรือชื่อเล่น <span>(ไม่จำเป็น)</span></label>
            <input id="feedback-name" name="name" maxlength="80" autocomplete="nickname" placeholder="ให้เราเรียกคุณว่าอะไร">
            <label for="feedback-message">ความคิดเห็น / ข้อเสนอแนะ <span>(จำเป็น)</span></label>
            <textarea id="feedback-message" name="message" rows="6" required maxlength="2000" aria-describedby="feedback-help feedback-count" placeholder="เช่น อยากให้เพิ่มประโยคสำหรับการสัมภาษณ์งาน หรือเล่าปัญหาที่พบพร้อมขั้นตอนการใช้งาน…"></textarea>
            <div class="feedback-meta"><span id="feedback-help">ข้อความจะส่งถึงผู้ดูแลเว็บเพื่อปรับปรุงการใช้งาน ไม่แสดงต่อสาธารณะ</span><span id="feedback-count">0 / 2,000</span></div>
            <div class="sentence-actions"><button type="submit" class="sentence-primary">ส่งความคิดเห็น</button></div>
            <p class="feedback-status" role="status" aria-live="polite"></p>
        </form>`;
    const form = element.querySelector('form');
    const message = form.elements.message;
    const status = element.querySelector('.feedback-status');
    const submit = element.querySelector('[type="submit"]');
    let sending = false;
    message.addEventListener('input', () => {
        message.setCustomValidity('');
        element.querySelector('#feedback-count').textContent = `${message.value.length.toLocaleString()} / 2,000`;
    });
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (sending) return;
        if (!message.value.trim()) { message.setCustomValidity('กรุณาเขียนความคิดเห็นก่อนส่ง'); message.reportValidity(); return; }
        if (!/^https?:$/.test(location.protocol)) {
            status.textContent = 'ยังส่งไม่ได้เมื่อเปิดเว็บจากไฟล์ กรุณาเปิดผ่านที่อยู่เว็บไซต์แล้วลองอีกครั้ง'; return;
        }
        sending = true; submit.disabled = true; submit.textContent = 'กำลังส่ง…'; status.textContent = '';
        const payload = { type: form.elements.type.value, name: form.elements.name.value, message: message.value };
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        Array.from(form.elements).forEach(input => input.disabled = true);
        try {
            const response = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
            if (response.status !== 201 || (await response.json()).message !== 'Feedback saved') throw new Error('Not saved');
            form.reset(); element.querySelector('#feedback-count').textContent = '0 / 2,000';
            status.textContent = 'ส่งความคิดเห็นแล้ว ขอบคุณที่ช่วยให้ Wordly ดีขึ้น!';
        } catch {
            status.textContent = 'ยังยืนยันการส่งไม่ได้ กรุณาลองอีกครั้ง ข้อความของคุณยังอยู่ในช่องเดิม';
        } finally {
            clearTimeout(timer); sending = false;
            Array.from(form.elements).forEach(input => input.disabled = false);
            submit.textContent = 'ส่งความคิดเห็น';
        }
    });
    return { element };
};
