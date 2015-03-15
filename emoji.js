(function emojiInsertion(window, undefined) {
'use strict';
var items = charDictionary.items, allChars = fillChars(items),
  regexp = new RegExp(allChars.join('|')), nodes;

function walkTheDOM(node, func) {
  if (func(node)) {
    node = node.firstChild;
    while (node) {
      walkTheDOM(node, func);
      node = node.nextSibling;
    }
  }
}

if (typeof MutationObserver !== 'function') window.MutationObserver = window.WebKitMutationObserver;

jQuery.fn.just_text = function just_text() {
  return $(this).children().end().text();
};

function filter_nodes(nodes, regexp) {
//  var nonEditable = nodes.querySelectorAll('[contenteditable!="true"]').querySelectorAll('[contenteditable!="plaintext-only"]'),
//    txt = function txt(index) {
//    };
  return $(nodes).find('[contenteditable!="true"][contenteditable!="plaintext-only"]').addBack().filter(function txt(index) {
    var result = false, html;
    if ($(this).just_text().search(regexp) !== -1) {
      html = $(this).html();
      if (html) {
        index = html.indexOf('document.write');
        result = (index === -1);
      } else result = true;
    }
    return result;
  });
}

function on_mutation(mutations) {
  var l = mutations.length, i, mutation, added, al, target;
  for (i = 0; i < l; i++) {
    mutation = mutations[i];
    added = mutation.addedNodes;
    al = added.length;
    target = mutation.target;
    if (al > 0) run(filter_nodes(added, regexp));
  }
}

function run(nodes) {
  nodes.forEach(function runnode(element, index, array) {
    var node = element, html, replacement;
    if (!$(node).html()) node = $(node).parent();
    if ($(node).html()) {
      html = $(node).html();
      replacement = html.replace(regexp, function replacer(c) {
        return '<span class="emojifont" id="emoji-font">' + c + '</span>';
      });
      $(node).html(replacement);
    }
  });
}

function isPrivate(ch) {
  var code;
  if (ch.length === 1) code = ch.charCodeAt(0);
  else code = (ch.charCodeAt(0) - 0xD800) * 0x400 + ch.charCodeAt(1) - 0xDC00 + 0x10000;
  return code >= 0xE000 && code <= 0xF8FF || code >= 0xF0000 && code <= 0xFFFFD ||
    code >= 0x100000 && code <= 0x10FFFD;
}

function fillChars(items) {
  var charArr = [];
  items.forEach(function charArray(element, index, array) {
    var chars = element.chars;
    chars.forEach(function ch(element, index, array) {
      charArr.push(element);
    });
  });
  chrome.extension.sendMessage({setting: 'hidePrivate'}, function filterHidden(response) {
    if (response.result) charArr = charArr.filter(function isNotPrivate(ch) {return !isPrivate(ch);});
  });
  return charArr;
}

function isInput(el) {
  return (el.nodeName.toLowerCase() === 'input' && el.type === 'text') ||
    (el.nodeName.toLowerCase() === 'textarea') || el.isContentEditable;
}

function isEdit(el) {
  var n = el.nodeName.toLowerCase();
  return ((n === 'input' && el.type === 'text') || (n === 'textarea') ||
    el.isContentEditable);
}

function fontExtend(el) {
  var font = window.getComputedStyle(el)['font-family'] || 'monospace';
  el.dataset.emoji_font = true;
  el.style.removeProperty('font-family');
  el.style.cssText += ['; font-family: ', font,
    ', "Segoe UI Emoji", "Segoe UI Symbol", Symbola, EmojiSymbols !important;'].join('');
}

function fontExtendEdit(e) {
  var el = e.target;
  if (isEdit(el) && !el.dataset.emoji_font) fontExtend(el);
}

document.addEventListener('focus', fontExtendEdit, true);

function fontExtendLoad(el) {
  var n = el.nodeName.toLowerCase();
  if (n !== 'script' && n !== 'stylesheet' && n !== 'link' && !isEdit(el) &&
      !el.dataset.emoji_font) fontExtend(el);
}

function fontExtender() {
  walkTheDOM(document.body, fontExtendLoad);
}

if (isReady()) fontExtender();
else document.addEventListener('DOMContentLoaded', fontExtender, false);

function start_observer() {
  var target = document.body, observer = new MutationObserver(on_mutation),
    config = {childList: true, characterData: true, subtree: true};
  observer.observe(target, config);
}

function init() {
  return; //no init for now
  nodes = filter_nodes($('body'), regexp);
  run(nodes);
  start_observer();
}

function isReady() {
  return /complete|loaded|interactive/.test(document.readyState);
}

chrome.extension.sendMessage({setting: 'blacklist'}, function checkBlacklist(response) {
  var blacklist = response.result;
  if (!blacklist) {
    if (isReady()) return init();
    return document.addEventListener('DOMContentLoaded', init, false);
  }
  blacklist = blacklist.split(',');
  var blacklisted = false;
  blacklist.forEach(function blist(element, index, array) {
    var bdomArr = element.split('.'), bl = bdomArr.length, domArr = document.domain.split('.');
    if (bl <= domArr.length) for (var i = bl; i--;) if (bdomArr.pop() !== domArr.pop()) break;
    blacklisted = blacklisted || !bdomArr.length;
  });
  if (!blacklisted) {
    if (isReady()) return init();
    return document.addEventListener('DOMContentLoaded', init, false);
  }
});
}(this));
