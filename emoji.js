(function emojiInsertion(window, undefined) {
'use strict';
var items = charDictionary.items, allChars = fillChars(items),
  regexp = filterHiddenEmojis(), nodes, blacklist;

if (typeof MutationObserver !== 'function') window.MutationObserver = window.WebKitMutationObserver;

jQuery.fn.just_text = function just_text() {
  return $(this).children().end().text();
};

function filter_nodes(nodes, regexp) {
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
  $.each(nodes, function runnode() {
    var node = $(this), html, replacement;
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

function filterHiddenEmojis() {
  if (localStorage.hidePrivate) allChars = allChars.filter(function isNotPrivate(ch) {return !isPrivate(ch);});
  return new RegExp(allChars.join('|'));
}

function fillChars(items) {
  var charArr = [];
  items.forEach(function charArray(element, index, array) {
    var chars = element.chars;
    chars.forEach(function ch(element, index, array) {
      charArr.push(element);
    });
  });
  return charArr;
}

function isInput(el) {
  return (el.nodeName.toLowerCase() === 'input' && el.type === 'text') ||
    (el.nodeName.toLowerCase() === 'textarea') || el.isContentEditable;
}

function fontExtend(e) {
  var el = e.target;
  if (isInput(el) && !el.dataset.emoji_font) {
    el.dataset.emoji_font = true;
    el.style.cssText += ['; font-family: ', window.getComputedStyle(el)['font-family'] || 'monospace',
      ', "Segoe UI Emoji", "Segoe UI Symbol", Symbola, EmojiSymbols !important;'].join('');
  }
}

document.addEventListener('focus', fontExtend, true);

function start_observer() {
  var target = document.body, observer = new MutationObserver(on_mutation),
    config = {childList: true, characterData: true, subtree: true};
  observer.observe(target, config);
}

function init() {
  nodes = filter_nodes($('body'), regexp);
  run(nodes);
  start_observer();
}

$(document).ready(function setup() {
  chrome.extension.sendMessage({setting: 'blacklist'}, function bset(response) {
    blacklist = response.result ? response.result.split(',') : [];
    var blacklisted = false;
    $.each(blacklist, function blist(key, value) {
      if (document.domain.indexOf(value) ===
          document.domain.length - value.length) blacklisted = true;
    });
    if (!blacklisted) init();
  });
});
}(this));
