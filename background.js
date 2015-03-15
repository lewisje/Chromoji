function setDefaultSettings() {
  'use strict';
  if (localStorage.hidePrivate == null) localStorage.hidePrivate = 'true';
  if (localStorage.blacklist == null) localStorage.blacklist = 'one.example,another.example';
}

function listenEmo(request, sender, sendResponse) {
  'use strict';
  var response = $.extend(true, {}, request);
  if (request.setting) response.result = localStorage[request.setting];
  sendResponse(response);
}

setDefaultSettings();
chrome.extension.onMessage.addListener(listenEmo);
