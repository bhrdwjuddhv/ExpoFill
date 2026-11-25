// jsdom has no layout engine: every element measures 0×0, which would make every field "not visible".
// This shim stacks elements vertically in document order (24 px apart) and keeps explicit zero sizes zero.

/** @param {Window} win */
export function applyLayout(win) {
  win.Element.prototype.getBoundingClientRect = function getBoundingClientRect() {
    const cs = win.getComputedStyle(this);
    const zero = cs.width === '0px' || cs.height === '0px';
    const all = [...this.ownerDocument.querySelectorAll('*')];
    const i = Math.max(0, all.indexOf(this.getRootNode().host ?? this));
    const top = i * 24;
    const [width, height] = zero ? [0, 0] : [300, 20];
    return { top, bottom: top + height, left: 0, right: width, width, height, x: 0, y: top };
  };
}
