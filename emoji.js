var charDictionary, items, valid, pattern, regexp, nodes, blacklist;

if (typeof MutationObserver !== 'function') window.MutationObserver = window.WebKitMutationObserver;

jQuery.fn.just_text = function just_text() {
  'use strict';
  return $(this).children().end().text();
};

function filter_nodes(nodes, regexp) {
  'use strict';
  return $(nodes).find('[contenteditable!="true"][contenteditable!="plaintext-only"]').addBack().filter(function txt(index) {
    var result = false, text = $(this).just_text(), found = (text.search(regexp) !== -1);
    if (found) {
      var html = $(this).html();
      if (html) {
        index = html.indexOf('document.write');
        result = (index === -1);
      } else result = true;
    }
    return result;
  });
}

function on_mutation(mutations) {
  'use strict';
  var i, l = mutations.length;
  for (i = 0; i < l; i++) {
    var mutation = mutations[i], added = mutation.addedNodes, al = added.length,
      target = mutation.target;
    if (al > 0) {
      var nodes = filter_nodes(added, regexp);
      run(nodes);
    }
  }
}

function run(nodes) {
  'use strict';
  $.each(nodes, function runnode() {
    var node = $(this);
    if (!$(node).html()) node = $(node).parent();
    if ($(node).html()) {
      var html = $(node).html(), replacement = html.replace(regexp, function replacer(c) {
        return '<span class="emojifont">' + c + '</span>';
      });
      $(node).html(replacement);
    }
  });
}

function start_observer() {
  'use strict';
  var target = document.body, observer = new MutationObserver(on_mutation),
    config = {childList: true, characterData: true, subtree: true};
  observer.observe(target, config);
}

function create_pattern(items) {
  'use strict';
  pattern = '';
  items.forEach(function charbuilder(element, index, array) {
    var chars = element.chars;
    chars.forEach(function ch(element, index, array) {
      pattern += element + '|';
    });
  });
  if (pattern != '') pattern = pattern.substr(0, pattern.length - 1);
}

function init() {
  'use strict';
  readCharDictionary(function validate(chars) {
    charDictionary = chars;
    items = chars.items;
    valid = items.filter(function val(element, index, array) {
      return element.image != '';
    });
    create_pattern(valid);
    regexp = new RegExp(pattern, 'g');
    nodes = filter_nodes($('body'), regexp);
    run(nodes);
    start_observer();
  });
}

$(document).ready(function setup() {
  'use strict';
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