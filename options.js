function loadOptions() {
  'use strict';
  document.getElementById('fieldblacklist').value = localStorage.blacklist;
}

function saveOptions() {
  'use strict';
	localStorage.blacklist = document.getElementById('fieldblacklist').value;
}

function init() {
  'use strict';
	document.getElementById('buttoncancel').addEventListener('click', window.close, false);
	document.getElementById('buttonsave').addEventListener('click', saveOptions, false);
	loadOptions();
}

window.addEventListener('load', init, false);
