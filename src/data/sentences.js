EngVocab.sentences = [
    ['ฉันกินอาหาร', 'I eat food', 'เริ่มด้วย I (ฉัน) ตามด้วย eat (กิน) และสิ่งที่กิน'],
    ['เธอดื่มน้ำทุกวัน', 'She drinks water every day', 'She ใช้กริยา drinks เติม s และวาง every day ไว้ท้ายประโยค', ['Every day she drinks water']],
    ['ฉันชอบแมว', 'I like cats', 'ชอบ = like ส่วนแมวโดยทั่วไปใช้ cats'],
    ['เขาเป็นครู', 'He is a teacher', 'ใช้ He + is และใส่ a หน้าชื่ออาชีพ'],
    ['พวกเรากำลังเรียนภาษาอังกฤษ', 'We are learning English', 'สิ่งที่กำลังทำใช้ are + กริยาเติม ing', ['We are studying English']],
    ['ฉันมีแมวสองตัว', 'I have two cats', 'มี = have และแมวมากกว่าหนึ่งตัวต้องเติม s'],
    ['นี่คือหนังสือของฉัน', 'This is my book', 'นี่คือ = This is และของฉัน = my'],
    ['คุณพร้อมหรือยัง', 'Are you ready', 'คำถามนี้เริ่มด้วย Are ตามด้วย you และ ready'],
    ['ฉันไม่ชอบกาแฟ', 'I do not like coffee', 'ปฏิเสธด้วย do not วางไว้หน้า like', ["I don't like coffee"]],
    ['เธอสามารถว่ายน้ำได้', 'She can swim', 'หลัง can ใช้กริยารูปพื้นฐาน ไม่เติม s'],
    ['ฉันไปโรงเรียนทุกวัน', 'I go to school every day', 'ไปโรงเรียน = go to school และทุกวัน = every day', ['Every day I go to school']],
    ['พวกเขากำลังเล่นฟุตบอล', 'They are playing football', 'They ใช้ are ตามด้วย playing', ['They are playing soccer']],
    ['ฉันซื้อหนังสือเมื่อวาน', 'I bought a book yesterday', 'อดีตของ buy คือ bought และเมื่อวาน = yesterday', ['Yesterday I bought a book']],
    ['พรุ่งนี้ฉันจะโทรหาคุณ', 'I will call you tomorrow', 'อนาคตใช้ will + call ส่วนพรุ่งนี้ = tomorrow', ['Tomorrow I will call you', "I'll call you tomorrow"]],
    ['คุณช่วยฉันได้ไหม', 'Can you help me', 'เริ่มคำถามด้วย Can แล้วตามด้วยประธานและกริยา'],
    ['มีหนังสืออยู่บนโต๊ะ', 'There is a book on the table', 'มีสิ่งของหนึ่งชิ้นใช้ There is และบนโต๊ะ = on the table'],
    ['ฉันอยากดื่มน้ำหนึ่งแก้ว', 'I would like a glass of water', 'อยากได้แบบสุภาพ = would like และน้ำหนึ่งแก้ว = a glass of water', ["I'd like a glass of water"]],
    ['ถ้าฝนตก ฉันจะอยู่บ้าน', 'If it rains I will stay home', 'If + ปัจจุบัน แล้วตามด้วย I will + กริยา', ['If it rains I will stay at home', 'I will stay home if it rains', 'I will stay at home if it rains']],
    ['ฉันเหนื่อยเพราะเมื่อคืนฉันนอนไม่หลับ', 'I am tired because I could not sleep last night', 'เชื่อมเหตุผลด้วย because และนอนไม่หลับในอดีต = could not sleep', ["I'm tired because I couldn't sleep last night", 'I am tired because I couldn’t sleep last night']],
    ['ฉันคิดว่าการเรียนภาษาอังกฤษสนุก', 'I think learning English is fun', 'ใช้ I think ตามด้วย learning English เป็นประธานของ is fun', ['I think that learning English is fun']]
].map(([thai, answer, hint, alternatives = []], id) => ({ id, thai, answer, hint, alternatives }));

EngVocab.sentenceAnswers = {
    normalize(value) {
        return String(value).normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'")
            .replace(/\bi'm\b/g, 'i am').replace(/\bi'll\b/g, 'i will').replace(/\bi'd\b/g, 'i would')
            .replace(/\bdon't\b/g, 'do not').replace(/\bcouldn't\b/g, 'could not')
            .replace(/[.,!?;:]/g, ' ').replace(/\s+/g, ' ').trim();
    },
    check(item, value) {
        const normalized = this.normalize(value);
        return normalized && [item.answer, ...item.alternatives].some(answer => this.normalize(answer) === normalized);
    }
};
