export function Icon({name, className = 'icon'}: {name: string; className?: string}) {
    const paths: Record<string, string> = {
        cards: '<rect x="7" y="3" width="13" height="17" rx="3"/><path d="m4 7-1 12a2 2 0 0 0 2 2h10M11 9h5m-5 4h3"/>',
        book: '<path d="M12 5v16m0-16C9 3 5 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-3-1-7-1-10 1Z"/>',
        chart: '<path d="M4 3v17h17M8 15v-4m5 4V7m5 8v-6"/>',
        shuffle: '<path d="m17 3 4 4-4 4m0 2 4 4-4 4M3 7h3c5 0 7 10 12 10h3M3 17h3c2 0 4-3 6-5m2-3c1-1 2-2 4-2h3"/>',
        arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
        chevron: '<path d="m9 5 7 7-7 7"/>',
        check: '<path d="m5 12 4 4L19 6"/>',
        bulb: '<path d="M9 18h6m-5 3h4M8 14a7 7 0 1 1 8 0c-1 1-1 2-1 3H9c0-1 0-2-1-3Z"/>',
        sound: '<path d="m11 4-6 5H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
        eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
        repeat: '<path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/>',
        flame: '<path d="M13 2c2 5-2 6-2 10 2 0 3-2 4-4 4 4 6 8 2 12-3 3-8 2-10-1C3 14 7 10 8 7c0 3 1 4 2 4-1-4 3-5 3-9Z"/>',
        target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
        briefcase: '<rect x="3" y="7" width="18" height="14" rx="3"/><path d="M8 7V4h8v3M3 12c6 4 12 4 18 0m-9 0v4"/>',
        monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/>',
        code: '<path d="m7 7-5 5 5 5m10-10 5 5-5 5M14 3l-4 18"/>',
        shield: '<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Z"/><path d="m8 12 3 3 5-6"/>',
        bed: '<path d="M2 5v15m20-9v9M2 16h20M7 9h2a2 2 0 0 1 2 2v5H4v-5a2 2 0 0 1 3-2Zm4 1h7a4 4 0 0 1 4 4v2"/>',
        utensils: '<path d="M4 2v7a3 3 0 0 0 6 0V2M7 2v20M20 2c-4 3-5 6-5 11h5m0-11v20"/>',
        sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
        plane: '<path d="m22 2-7 20-4-9L2 9 22 2ZM11 13 22 2"/>',
        search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
        leaf: '<path d="M20 3C9 1 1 9 5 17c8 5 17-3 15-14ZM3 21 15 9"/>',
        info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-11v1"/>',
    };
    return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" dangerouslySetInnerHTML={{__html: paths[name] || paths.book}} />;
}
