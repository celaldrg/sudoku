/**
 * App entry point: owns the game state, wires DOM events to the pure game
 * actions, renders, keeps time and saves progress.
 */
import { askConfirm, isDialogOpen, openDialog } from './dialogs.js';
import {
  HINTS_PER_GAME,
  canUndo,
  checkBoard,
  createDemoGame,
  createGame,
  erase,
  formatTime,
  inputDigit,
  moveSelection,
  restartGame,
  restoreGame,
  selectCell,
  serializeGame,
  tick,
  toggleNotesMode,
  undo,
  useHint,
} from './game.js';
import { DEFAULT_LANG, normalizeLang, otherLang, translate } from './i18n.js';
import { keyToCommand } from './keys.js';
import { readJSON, writeJSON } from './storage.js';
import { applyTranslations, buildBoard, buildPad, renderBoard, renderPad } from './view.js';

const GAME_KEY = 'sudoku.game';
const LANG_KEY = 'sudoku.lang';
const TICK_MS = 250;
const MAX_TICK_MS = 1000;
const SAVE_EVERY_MS = 5000;
const TOAST_MS = 1900;

const params = new URLSearchParams(window.location.search);
const isDemo = params.has('demo');
const byId = (id) => document.getElementById(id);

const ui = {
  board: byId('board'),
  pad: byId('pad'),
  difficulty: byId('difficulty'),
  time: byId('time'),
  newGame: byId('new-game'),
  restart: byId('restart'),
  lang: byId('lang'),
  undo: byId('undo'),
  erase: byId('erase'),
  notes: byId('notes'),
  hint: byId('hint'),
  hintsLeft: byId('hints-left'),
  check: byId('check'),
  toast: byId('toast'),
  confirmDialog: byId('confirm-dialog'),
  confirmText: byId('confirm-text'),
  winDialog: byId('win-dialog'),
  winTime: byId('win-time'),
  winDifficulty: byId('win-difficulty'),
  winHints: byId('win-hints'),
};

let lang = normalizeLang(params.get('lang')) ?? normalizeLang(readJSON(LANG_KEY)) ?? DEFAULT_LANG;
let state = loadInitialState();
let lastTick = performance.now();
let sinceSave = 0;
let toastTimer = 0;

const cells = buildBoard(ui.board);
const padButtons = buildPad(ui.pad);

wireEvents();
applyLanguage();
window.setInterval(onTick, TICK_MS);

function t(key, values) {
  return translate(lang, key, values);
}

function loadInitialState() {
  if (isDemo) return createDemoGame();
  const saved = restoreGame(readJSON(GAME_KEY));
  if (saved && saved.status === 'playing') return saved;
  return createGame({ difficulty: saved?.difficulty ?? 'medium' });
}

/** Replaces the state, re-renders, saves and celebrates a fresh win. */
function update(next) {
  if (next === state) return;
  const justWon = state.status === 'playing' && next.status === 'won';
  state = next;
  render();
  save();
  if (justWon) showWin();
}

function save() {
  sinceSave = 0;
  if (!isDemo) writeJSON(GAME_KEY, serializeGame(state));
}

function render() {
  renderBoard(cells, state, t);
  renderPad(padButtons, ui.pad, state, t);
  const playing = state.status === 'playing';
  ui.undo.disabled = !canUndo(state);
  ui.erase.disabled = !playing;
  ui.check.disabled = !playing;
  ui.hint.disabled = !playing || state.hintsLeft <= 0;
  ui.hintsLeft.textContent = String(state.hintsLeft);
  ui.hint.setAttribute('aria-label', t('hintLabel', { n: state.hintsLeft }));
  ui.notes.setAttribute('aria-pressed', String(state.notesMode));
  ui.difficulty.value = state.difficulty;
  ui.board.classList.toggle('won', !playing);
  renderTimer();
}

function renderTimer() {
  ui.time.textContent = formatTime(state.elapsedMs);
}

function applyLanguage() {
  document.documentElement.lang = lang;
  applyTranslations(document, t);
  ui.lang.textContent = otherLang(lang).toUpperCase();
  ui.lang.setAttribute('aria-label', t('switchLanguage'));
  ui.lang.title = t('switchLanguage');
  render();
}

function toast(key, values) {
  ui.toast.textContent = t(key, values);
  ui.toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => ui.toast.classList.remove('show'), TOAST_MS);
}

/** True when the selected cell can take input; otherwise explains why not. */
function selectionEditable() {
  if (state.status !== 'playing') return false;
  if (state.selected < 0) {
    toast('toastSelect');
    return false;
  }
  if (state.puzzle[state.selected] !== 0) {
    toast('toastGiven');
    return false;
  }
  return true;
}

function enterDigit(digit) {
  if (!selectionEditable()) return;
  if (state.notesMode && state.values[state.selected] !== 0) {
    toast('toastNotesOnValue');
    return;
  }
  update(inputDigit(state, digit));
}

function eraseSelected() {
  if (selectionEditable()) update(erase(state));
}

function toggleNotes(announce) {
  update(toggleNotesMode(state));
  if (announce) toast(state.notesMode ? 'toastNotesOn' : 'toastNotesOff');
}

function checkMistakes() {
  const next = checkBoard(state);
  update(next);
  if (next.mistakes.length === 0) toast('toastCheckOk');
  else toast('toastCheckBad', { n: next.mistakes.length });
}

function hasProgress() {
  return state.status === 'playing' && state.history.length > 0;
}

async function confirmLoss(messageKey) {
  return !hasProgress() || askConfirm(ui.confirmDialog, ui.confirmText, t(messageKey));
}

async function startNewGame(difficulty) {
  if (await confirmLoss('confirmNew')) update(createGame({ difficulty }));
  else ui.difficulty.value = state.difficulty;
}

async function restart() {
  if (await confirmLoss('confirmRestart')) update(restartGame(state));
}

async function showWin() {
  ui.winTime.textContent = formatTime(state.elapsedMs);
  ui.winDifficulty.textContent = t(state.difficulty);
  ui.winHints.textContent = String(HINTS_PER_GAME - state.hintsLeft);
  if ((await openDialog(ui.winDialog)) === 'new') startNewGame(state.difficulty);
}

function runCommand(command) {
  switch (command.type) {
    case 'move':
      update(moveSelection(state, command.dRow, command.dCol));
      break;
    case 'digit':
      enterDigit(command.digit);
      break;
    case 'erase':
      eraseSelected();
      break;
    case 'notes':
      toggleNotes(true);
      break;
    case 'undo':
      update(undo(state));
      break;
  }
}

function onKeyDown(event) {
  if (isDialogOpen() || event.target.closest?.('select, input, textarea')) return;
  const command = keyToCommand(event.key, event);
  if (!command) return;
  event.preventDefault();
  runCommand(command);
}

function onBoardPointer(event) {
  const cell = event.target.closest('.cell');
  if (cell) update(selectCell(state, Number(cell.dataset.index)));
}

function onTick() {
  const now = performance.now();
  const dt = Math.min(now - lastTick, MAX_TICK_MS);
  lastTick = now;
  if (document.hidden || isDialogOpen() || state.status !== 'playing') return;
  state = tick(state, dt);
  renderTimer();
  sinceSave += dt;
  if (sinceSave >= SAVE_EVERY_MS) save();
}

function wireEvents() {
  ui.board.addEventListener('pointerdown', onBoardPointer);
  ui.board.addEventListener('click', onBoardPointer);
  ui.pad.addEventListener('click', (event) => {
    const button = event.target.closest('[data-digit]');
    if (button) enterDigit(Number(button.dataset.digit));
  });
  ui.undo.addEventListener('click', () => update(undo(state)));
  ui.erase.addEventListener('click', eraseSelected);
  ui.notes.addEventListener('click', () => toggleNotes(false));
  ui.hint.addEventListener('click', () => update(useHint(state)));
  ui.check.addEventListener('click', checkMistakes);
  ui.newGame.addEventListener('click', () => startNewGame(ui.difficulty.value));
  ui.restart.addEventListener('click', restart);
  ui.difficulty.addEventListener('change', () => startNewGame(ui.difficulty.value));
  ui.lang.addEventListener('click', () => {
    lang = otherLang(lang);
    writeJSON(LANG_KEY, lang);
    applyLanguage();
  });
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) save();
  });
  window.addEventListener('pagehide', save);
}
