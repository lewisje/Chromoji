function readCharDictionary(callback) {
  'use strict';
  var request = new XMLHttpRequest(), url = chrome.extension.getURL('chardict.json');
  request.open('GET', url);
  request.addEventListener('load', function getChars(e) {
    callback(JSON.parse(request.responseText));
  }, false);
  request.send(null);
}