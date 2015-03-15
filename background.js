function setDefaultSettings() {
  'use strict';
  if (localStorage.hidePrivate == null) localStorage.hidePrivate = 'true';
  if (localStorage.blacklist == null) localStorage.blacklist = 'one.example,another.example';
}

function listenEmo(request, sender, sendResponse) {
  'use strict';
  var clone = function clone(dest, strt) {
    for (var prop in strt) {
      if (strt.hasOwnProperty(prop)) {
        if ((typeof strt[prop] === 'object' || typeof strt[prop] === 'function') &&
            strt[prop] !== null && dest[prop]) clone(dest[prop], strt[prop]);
        else dest[prop] = strt[prop];
      }
    }
  }, response = clone(Object.create(Object.getPrototypeOf(request)), request);
  if (request.setting) response.result = localStorage[request.setting];
  sendResponse(response);
}

setDefaultSettings();
chrome.extension.onMessage.addListener(listenEmo);
