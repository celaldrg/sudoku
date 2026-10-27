/**
 * Small promise-based helpers around the native <dialog> elements.
 */

/**
 * Shows a modal dialog and resolves with the value of the button that closed it.
 * Pressing Escape resolves with an empty string.
 * @param {HTMLDialogElement} dialog A dialog whose form uses method="dialog".
 * @returns {Promise<string>}
 */
export function openDialog(dialog) {
  dialog.returnValue = '';
  dialog.showModal();
  return new Promise((resolve) => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue), { once: true });
  });
}

/**
 * Asks a yes/no question in the confirm dialog.
 * @param {HTMLDialogElement} dialog The confirm dialog (its buttons have values "yes" and "cancel").
 * @param {HTMLElement} textEl Element that shows the question.
 * @param {string} message Already translated question.
 * @returns {Promise<boolean>} True when the player chose "yes".
 */
export async function askConfirm(dialog, textEl, message) {
  textEl.textContent = message;
  return (await openDialog(dialog)) === 'yes';
}

/**
 * True while any modal dialog on the page is open.
 * @returns {boolean}
 */
export function isDialogOpen() {
  return document.querySelector('dialog[open]') !== null;
}
