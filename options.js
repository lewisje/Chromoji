function loadOptions() {
  'use strict';
	var blacklist = document.getElementById('fieldblacklist'),
	  value = localStorage.blacklist;
	blacklist.value = value;
}

function saveOptions() {
  'use strict';
	localStorage.scale = '1.0';
	localStorage.ioscompat = false;
	localStorage.usefont = true;
	var blacklist = document.getElementById('fieldblacklist'),
	  value = blacklist.value;
	localStorage.blacklist = value;
	window.close();
}

function cancelOptions() {
  'use strict';
	window.close();
}

function init() {
  'use strict';
	var save = document.getElementById('buttonsave');
	save.addEventListener('click', saveOptions, false);

	var cancel = document.getElementById('buttoncancel');
	cancel.addEventListener('click', cancelOptions, false);

	loadOptions();
}

window.addEventListener('load', init, false);
