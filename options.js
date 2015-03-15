(function optSet(window, undefined) {
'use strict';

function loadOptions() {
  document.getElementById('fieldhidePrivate').checked = (localStorage.hidePrivate == 'true');
  document.getElementById('fieldblacklist').value = localStorage.blacklist;
}

function saveOptions() {
	localStorage.hidePrivate = document.getElementById('fieldhidePrivate').checked;
	localStorage.blacklist = document.getElementById('fieldblacklist').value;
}

function cancelOptions() {
  window.close();
}

document.getElementById('buttoncancel').addEventListener('click', cancelOptions, false);
document.getElementById('buttonsave').addEventListener('click', saveOptions, false);
loadOptions();
}(this));
