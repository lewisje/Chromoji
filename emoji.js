(function emojiInsertion(window, undefined) {
  'use strict';
  var walkTheDOM = function walkTheDOM(node, func) {
      if (func(node)) {
        node = node.firstChild;
        while (node) {
          walkTheDOM(node, func);
          node = node.nextSibling;
        }
      }
    }, isEdit = function isEdit(el) {
      var n = el.nodeName.toLowerCase();
      return ((n === 'input' && el.type === 'text') || (n === 'textarea') ||
        el.isContentEditable);
    }, fontExtend = function fontExtend(el) {
      var font = window.getComputedStyle(el)['font-family'] || 'monospace';
      el.dataset.emoji_font = true;
      el.style.removeProperty('font-family');
      el.style.cssText += ['; font-family: ', font, ", 'Segoe UI Emoji', 'Segoe UI Symbol',",
                           ' emojiSymb, emojiOSns, emojiSym, emojiAnd !important;'].join('');
    }, fontExtendEdit = function fontExtendEdit(e) {
      var el = e.target;
      if (isEdit(el) && !el.dataset.emoji_font) fontExtend(el);
    }, fontExtendLoad = function fontExtendLoad(el) {
      var n = el.nodeName.toLowerCase();
      if (n !== 'script' && n !== 'stylesheet' && n !== 'link' && !isEdit(el) &&
          !el.dataset.emoji_font) fontExtend(el);
    }, fontExtender = function fontExtender() {
      walkTheDOM(document.body, fontExtendLoad);
    }, r = document.readyState;
  if (r === 'complete' || r === 'loaded' || r === 'interactive') fontExtender();
  else document.addEventListener('DOMContentLoaded', fontExtender, false);
  document.addEventListener('focus', fontExtendEdit, true);
}(this));
