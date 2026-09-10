EngVocab.createStorage = function () {
    const key = 'wordly.progress.v1';
    const ids = new Set(EngVocab.vocabulary.map(word => word.id));
    let persistent = true;
    const state = { records: {}, activity: {}, category: 'all' };
    try {
        const raw = JSON.parse(localStorage.getItem(key) || 'null');
        if (raw && typeof raw === 'object') {
            for (const [id, record] of Object.entries(raw.records || {})) {
                if (ids.has(id) && ['known', 'practice'].includes(record?.status)) {
                    state.records[id] = { status: record.status };
                    if ([0, 0.5, 1].includes(record.score)) state.records[id].score = record.score;
                }
            }
            for (const [day, count] of Object.entries(raw.activity || {})) {
                if (/^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isSafeInteger(count) && count > 0) state.activity[day] = count;
            }
            if (EngVocab.categories.some(category => category.id === raw.category)) state.category = raw.category;
        }
    } catch { persistent = false; }
    function save() {
        try { localStorage.setItem(key, JSON.stringify(state)); persistent = true; }
        catch { persistent = false; }
    }
    return {
        get state() { return state; },
        get persistent() { return persistent; },
        rate(id, status, score) {
            if (!ids.has(id) || !['known', 'practice'].includes(status)) return;
            state.records[id] = { status };
            if ([0, 0.5, 1].includes(score)) state.records[id].score = score;
            const today = EngVocab.study.dayKey();
            state.activity[today] = (state.activity[today] || 0) + 1;
            save();
        },
        setCategory(category) { state.category = category; save(); }
    };
};
