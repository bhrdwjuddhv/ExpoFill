// Sets values the way a person typing would, so React/Vue/Angular state updates too.

const protoFor = (el) => {
  const win = el.ownerDocument.defaultView;
  if (el.tagName === 'TEXTAREA') return win.HTMLTextAreaElement.prototype;
  if (el.tagName === 'SELECT') return win.HTMLSelectElement.prototype;
  return win.HTMLInputElement.prototype;
};

const fire = (el, type, Ctor = 'Event', init = {}) => {
  const win = el.ownerDocument.defaultView;
  const C = win[Ctor] ?? win.Event;
  el.dispatchEvent(new C(type, { bubbles: true, cancelable: true, ...init }));
};

/**
 * Sets `value` through the prototype setter (bypassing framework overrides on the instance),
 * then fires focus, input, change and blur.
 */
export function setNativeValue(el, value) {
  el.focus({ preventScroll: true });
  Object.getOwnPropertyDescriptor(protoFor(el), 'value').set.call(el, value);
  fire(el, 'input', 'InputEvent', { inputType: 'insertText', data: String(value) });
  fire(el, 'change');
  el.blur();
}

/** Selects an option by index through the prototype setter, then fires input and change. */
export function setSelectIndex(el, index) {
  el.focus({ preventScroll: true });
  Object.getOwnPropertyDescriptor(protoFor(el), 'selectedIndex').set.call(el, index);
  fire(el, 'input');
  fire(el, 'change');
  el.blur();
}

/** Rich-text boxes: replace the text and fire input. */
export function setContentEditable(el, text) {
  el.focus({ preventScroll: true });
  el.textContent = text;
  fire(el, 'input', 'InputEvent', { inputType: 'insertText', data: String(text) });
  el.blur();
}

const SUBMIT_WORDS = /\b(submit|register|registration|pay|payment|checkout|buy|purchase|book now|sign up|send)\b/i;

/**
 * True for anything that would send the form: submit buttons (including a <button> with no type
 * inside a form) and buttons whose text says submit/register/pay. ExpoFill never clicks these.
 */
export function isSubmitLike(el) {
  if (el.tagName === 'BUTTON') {
    const type = (el.getAttribute('type') || 'submit').toLowerCase();
    if (type === 'submit' && el.form) return true;
  }
  if (el.tagName === 'INPUT' && /^(submit|image)$/i.test(el.type)) return true;
  const isButton = el.tagName === 'BUTTON' || el.getAttribute('role') === 'button';
  return isButton && SUBMIT_WORDS.test(`${el.textContent} ${el.getAttribute('aria-label') ?? ''} ${el.value ?? ''}`);
}

/**
 * A full pointer + mouse click sequence for custom widgets. On a submit-like element it sends only
 * press events (enough to open most dropdowns) and never the click.
 */
export function dispatchClick(el) {
  const win = el.ownerDocument.defaultView;
  const opts = { bubbles: true, cancelable: true, view: win, button: 0 };
  const P = win.PointerEvent ?? win.MouseEvent;
  el.dispatchEvent(new P('pointerdown', opts));
  el.dispatchEvent(new win.MouseEvent('mousedown', opts));
  el.dispatchEvent(new P('pointerup', opts));
  el.dispatchEvent(new win.MouseEvent('mouseup', opts));
  if (!isSubmitLike(el)) el.dispatchEvent(new win.MouseEvent('click', opts));
}

/** Checked state of a native or ARIA radio/checkbox. */
export const isChecked = (el) =>
  el.tagName === 'INPUT' ? el.checked : el.getAttribute('aria-checked') === 'true';

/** Toggles a native or ARIA radio/checkbox with a real click. */
export function toggle(el) {
  if (el.tagName === 'INPUT') el.click();
  else dispatchClick(el);
}
