EngVocab.study = {
    pool(words, category, reviewOnly, records) {
        return words.filter(word => (category === 'all' || word.category === category)
            && (!reviewOnly || records[word.id]?.status === 'practice'));
    },
    random(words, previousId, random = Math.random) {
        const candidates = words.length > 1 ? words.filter(word => word.id !== previousId) : words;
        return candidates.length ? candidates[Math.floor(random() * candidates.length)] : null;
    },
    counts(words, records) {
        const known = words.filter(word => records[word.id]?.status === 'known').length;
        const practice = words.filter(word => records[word.id]?.status === 'practice').length;
        return { total: words.length, known, practice, unseen: words.length - known - practice };
    },
    dayKey(date = new Date()) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    },
    recentDays(activity, now = new Date()) {
        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 + i);
            const key = this.dayKey(date);
            return { key, label: date.toLocaleDateString('th-TH', { weekday: 'short' }), count: activity[key] || 0 };
        });
    },
    streak(activity, now = new Date()) {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (!activity[this.dayKey(date)]) date.setDate(date.getDate() - 1);
        let count = 0;
        while (activity[this.dayKey(date)]) {
            count++;
            date.setDate(date.getDate() - 1);
        }
        return count;
    }
};
