function loadOptions() {
  'use strict';
  document.getElementById('fieldhidePrivate').checked = (localStorage.hidePrivate == 'true');
  document.getElementById('fieldblacklist').value = localStorage.blacklist;
}

function saveOptions() {
  'use strict';
	localStorage.hidePrivate = document.getElementById('fieldhidePrivate').checked;
	localStorage.blacklist = document.getElementById('fieldblacklist').value;
}

function cancelOptions() {
  'use strict';
  window.close();
}

function init() {
  'use strict';
	document.getElementById('buttoncancel').addEventListener('click', cancelOptions, false);
	document.getElementById('buttonsave').addEventListener('click', saveOptions, false);
	loadOptions();
}

window.addEventListener('load', init, false);
