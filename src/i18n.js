/**
 * User-facing strings in English and Turkish, plus a tiny translate helper.
 * Placeholders look like {name} and are filled from a params object.
 */

/** Supported language codes; the first one is the default. */
export const LANGUAGES = Object.freeze(['en', 'tr']);

/** Language used when nothing else is chosen. */
export const DEFAULT_LANG = 'en';

/** Every string, keyed by language and then by message id. */
export const STRINGS = Object.freeze({
  en: Object.freeze({
    newGame: 'New game',
    restart: 'Restart',
    switchLanguage: 'Switch to Turkish',
    difficulty: 'Difficulty',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    time: 'Time',
    undo: 'Undo',
    erase: 'Erase',
    notes: 'Notes',
    hint: 'Hint',
    hintLabel: 'Hint, {n} left',
    check: 'Check',
    board: 'Sudoku board',
    numberPad: 'Number pad',
    actions: 'Game actions',
    cellLabel: 'Row {row}, column {col}: {content}',
    cellEmpty: 'empty',
    cellGiven: '{digit}, given',
    cellNotes: 'notes {digits}',
    padDigit: '{digit}, {n} left',
    keysHelp: 'Arrows move · 1–9 enter · 0 / Del erase · N notes · Ctrl+Z undo',
    toastSelect: 'Select a cell first',
    toastGiven: 'That digit is part of the puzzle',
    toastNotesOnValue: 'Erase the digit to add notes',
    toastNotesOn: 'Notes on',
    toastNotesOff: 'Notes off',
    toastCheckOk: 'No mistakes so far',
    toastCheckBad: 'Mistakes: {n} (marked in red)',
    confirmNew: 'Start a new game? Your progress on this puzzle will be lost.',
    confirmRestart: 'Restart this puzzle? All your entries will be cleared.',
    yes: 'Yes',
    cancel: 'Cancel',
    winTitle: 'Solved!',
    winText: 'Every row, column and box is complete.',
    hintsUsed: 'Hints used',
    close: 'Close',
    sourceLink: 'Source on GitHub',
  }),
  tr: Object.freeze({
    newGame: 'Yeni oyun',
    restart: 'Yeniden başla',
    switchLanguage: 'İngilizceye geç',
    difficulty: 'Zorluk',
    easy: 'Kolay',
    medium: 'Orta',
    hard: 'Zor',
    time: 'Süre',
    undo: 'Geri al',
    erase: 'Sil',
    notes: 'Notlar',
    hint: 'İpucu',
    hintLabel: 'İpucu, {n} kaldı',
    check: 'Kontrol',
    board: 'Sudoku tahtası',
    numberPad: 'Sayı tuşları',
    actions: 'Oyun işlemleri',
    cellLabel: '{row}. satır, {col}. sütun: {content}',
    cellEmpty: 'boş',
    cellGiven: '{digit}, sabit',
    cellNotes: 'notlar {digits}',
    padDigit: '{digit}, {n} kaldı',
    keysHelp: 'Oklar: hareket · 1–9: gir · 0 / Del: sil · N: notlar · Ctrl+Z: geri al',
    toastSelect: 'Önce bir hücre seç',
    toastGiven: 'Bu rakam bulmacanın parçası',
    toastNotesOnValue: 'Not eklemek için önce rakamı sil',
    toastNotesOn: 'Notlar açık',
    toastNotesOff: 'Notlar kapalı',
    toastCheckOk: 'Şimdilik hata yok',
    toastCheckBad: 'Hata: {n} (kırmızıyla işaretli)',
    confirmNew: 'Yeni oyun başlatılsın mı? Bu bulmacadaki ilerlemen kaybolacak.',
    confirmRestart: 'Bulmaca baştan başlasın mı? Tüm girdilerin silinecek.',
    yes: 'Evet',
    cancel: 'Vazgeç',
    winTitle: 'Çözüldü!',
    winText: 'Bütün satırlar, sütunlar ve kutular tamam.',
    hintsUsed: 'Kullanılan ipucu',
    close: 'Kapat',
    sourceLink: 'Kaynak kod GitHub’da',
  }),
});

/**
 * Returns a supported language code, or null for anything else.
 * @param {unknown} value Candidate such as "tr" or "EN".
 * @returns {'en' | 'tr' | null}
 */
export function normalizeLang(value) {
  const code = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return LANGUAGES.includes(code) ? code : null;
}

/**
 * The language the toggle switches to.
 * @param {'en' | 'tr'} lang Current language.
 * @returns {'en' | 'tr'}
 */
export function otherLang(lang) {
  return lang === 'tr' ? 'en' : 'tr';
}

/**
 * Looks up a message and fills its {placeholders}.
 * Falls back to English, then to the key itself.
 * @param {string} lang Language code.
 * @param {string} key Message id.
 * @param {Record<string, string | number>} [params] Placeholder values.
 * @returns {string}
 */
export function translate(lang, key, params = {}) {
  const table = STRINGS[normalizeLang(lang) ?? DEFAULT_LANG];
  const text = table[key] ?? STRINGS[DEFAULT_LANG][key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name) =>
    Object.hasOwn(params, name) ? String(params[name]) : match,
  );
}
