EngVocab.answers = {
    normalize(value) {
        return String(value).normalize('NFKC').toLocaleLowerCase('th')
            // NFKC decomposes Thai sara am; recompose it so Thai regexes and text agree.
            .replace(/\u0E4D([\u0E48-\u0E4B]?)\u0E32/gu, '$1\u0E33')
            .replace(/[\s\u200B-\u200D\uFEFF]+/gu, '')
            .replace(/^[“”"'‘’]+|[“”"'‘’.!！。]+$/gu, '');
    },
    phrasing(value) {
        return value
            .replace(/^(?:คำนี้)?(?:น่าจะ(?:แปลว่า|หมายถึง)|แปลว่า|หมายถึง|คือ)/u, '')
            .replace(/^(?:คือ|เป็น)/u, '')
            .replace(/(?:นะครับ|นะคะ|ครับ|ค่ะ|คะ)$/u, '')
            .replace(/ฟังก์ชั่น|ฟังชั่น|ฟังชัน/gu, 'ฟังก์ชัน')
            .replace(/เวอร์ชั่น/gu, 'เวอร์ชัน')
            .replace(/อ็อบเจค|ออบเจค|อ็อบเจ็กต์/gu, 'ออบเจ็กต์')
            .replace(/เซิฟเวอร์|เซิร์ฟเว่อร์/gu, 'เซิร์ฟเวอร์')
            .replace(/(?<!พื้น)(?:ที่ใช้สำหรับ|ที่ใช้ในการ|ที่ใช้)|(?:สำหรับใช้|ใช้สำหรับ|ใช้ในการ|ซึ่งใช้|ทำหน้าที่|สำหรับ)/gu, '')
            .replace(/^(?:การ)/u, '');
    },
    check(word, answer) {
        const normalized = this.normalize(answer);
        if (!normalized) return { status: 'empty' };
        const completeValues = [...word.translations, ...(word.answerAliases || [])];
        const accepted = new Set(completeValues.map(value => this.normalize(value)));
        const phrased = new Set(completeValues.map(value => this.phrasing(this.normalize(value))));
        const partial = new Set((word.partialTranslations || []).map(value => this.normalize(value)));
        const partialPhrased = new Set((word.partialTranslations || []).map(value => this.phrasing(this.normalize(value))));
        const classify = value => {
            // Strip only conversational wrappers, never negation or arbitrary surrounding text.
            const plain = value.replace(/^(?:คำนี้(?:แปลว่า|หมายถึง)|แปลว่า|หมายถึง|คือ)/u, '').replace(/(?:ครับ|ค่ะ|คะ)$/u, '');
            if (accepted.has(value) || accepted.has(plain)) return 1;
            const phrasing = this.phrasing(value);
            if (phrasing && phrased.has(phrasing)) return 1;
            if (word.answerPatterns?.correct?.some(pattern => pattern.test(plain))) return 1;
            if (word.meaningPatterns?.some(pattern => pattern.test(phrasing))) return 1;
            if (partial.has(plain) || (phrasing && partialPhrased.has(phrasing)) || partial.has(plain.replace(/^การ/u, '')) || word.answerPatterns?.partial?.some(pattern => pattern.test(plain))) return 0.5;
            return 0;
        };
        let score = classify(normalized);
        // Every listed meaning must qualify. Do not let a right phrase hide an unrelated guess.
        if (!score) {
            const parts = String(answer).split(/[,，;；/\n]+|\s+หรือ\s+/u).map(value => this.normalize(value));
            if (parts.length > 1) score = Math.min(...parts.map(value => value ? classify(value) : 0));
        }
        return { status: score === 1 ? 'correct' : score === 0.5 ? 'partial' : 'unmatched', score,
            explanation: score === 0.5 ? word.partialExplanation : undefined };
    }
};
