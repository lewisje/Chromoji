function setDefaultSettings() {
  'use strict';
  localStorage.blacklist = localStorage.blacklist || 'one.example,another.example';
}

function listener(request, sender, sendResponse) {
  'use strict';
  var response = $.extend(true, {}, request);
  if (request.setting) response.result = localStorage[request.setting];
  sendResponse(response);
}

function self_test() {
  'use strict';
  readCharDictionary(function reader(dict) {
    var items = dict.items, item;
    for (var i = items.length - 1; i--;) {
      item = items[i];
      if (item.name == '' || item.id == '' || item.id.indexOf(' ') !== -1 ||
          item.chars.length < 1) console.error(item);
    }
    console.log('Done.');
  });
}

setDefaultSettings();
chrome.extension.onMessage.addListener(listener);
if (localStorage.debug) self_test();