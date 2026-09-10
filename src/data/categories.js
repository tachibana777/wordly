window.EngVocab = window.EngVocab || {};
EngVocab.categories = [
    { id: 'office', name: 'การทำงานทั่วไป', english: 'Work & Office', icon: 'briefcase', color: '#c57936', description: 'ประชุม งาน และการสื่อสารในออฟฟิศ' },
    { id: 'computer', name: 'คอมพิวเตอร์', english: 'Computers & IT', icon: 'monitor', color: '#5d80ab', description: 'อุปกรณ์ ซอฟต์แวร์ และเครือข่าย' },
    { id: 'dev', name: 'การพัฒนาโปรแกรม', english: 'Development', icon: 'code', color: '#8372b3', description: 'เขียนโค้ด ทดสอบ และพัฒนาระบบ' },
    { id: 'cyber', name: 'ความปลอดภัยไซเบอร์', english: 'Cybersecurity', icon: 'shield', color: '#639281', description: 'ภัยคุกคามและการปกป้องข้อมูล' },
    { id: 'hotel', name: 'โรงแรม', english: 'Hotels & Hospitality', icon: 'bed', color: '#aa7c98', description: 'จองห้องพักและบริการสำหรับผู้เข้าพัก' },
    { id: 'restaurant', name: 'ร้านอาหาร', english: 'Food & Restaurants', icon: 'utensils', color: '#c8795e', description: 'สั่งอาหาร รสชาติ และการบริการ' },
    { id: 'daily', name: 'ชีวิตประจำวัน', english: 'Everyday Life', icon: 'sun', color: '#b09544', description: 'คำใกล้ตัวที่หยิบมาใช้ได้ทุกวัน' },
    { id: 'travel', name: 'การท่องเที่ยว', english: 'Travel & Explore', icon: 'plane', color: '#5697a2', description: 'เดินทาง สำรวจ และเปิดประสบการณ์' }
];
EngVocab.vocabulary = [];
EngVocab.addVocabulary = function (category, rows) {
    const metadata = EngVocab.categories.find(item => item.id === category);
    rows.trim().split('\n').forEach((row, index) => {
        const [word, partOfSpeech, meaning, hint, example] = row.split('|').map(value => value.trim());
        EngVocab.vocabulary.push({ id: `${category}-${index + 1}`, category, categoryName: metadata.name, word, partOfSpeech, meaning, hint, example });
    });
};
