function readCharDictionary(callback) {
  'use strict';
  var request = new XMLHttpRequest(), path = 'chardict.json',
   url = chrome.extension.getURL(path);
  request.open('GET', url);
  request.addEventListener('load', function getChars(e) {
    var chars = JSON.parse(request.responseText);
    callback(chars);
  }, false);
  request.send(null);
}