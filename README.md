Emoji Polyfill
========

This is a Google Chrome extension for Windows, OS X, and Linux that adds support
for textual emoji, based on the Unicode standard: http://www.unicode.org/charts/PDF/U1F300.pdf
A good test page is located on Wikipedia: https://en.wikipedia.org/wiki/Emoji

This `master` branch has been abandoned for now; development continues on the `simple` branch.

Go here to install the UserScript: https://greasyfork.org/en/scripts/8598-emoji-polyfill

Go here to install the extension: https://chrome.google.com/webstore/detail/emoji-polyfill/kaplhmhahkanhjahbdbaamdaililfmkj

Emoji Polyfill can also be installed as a bookmarklet:
```javascript
javascript:var i,s,ply,ss=['//greasyfork.org/scripts/8598-emoji-polyfill/code/Emoji Polyfill.user.js'];if(!ply){ply=true;for(i=ss.length;i--;){s=document.createElement('script');s.src=ss[i];document.body.appendChild(s);}}void(0);
```

This is a fork of Chromoji by Locomojis, a Google Chrome extension that allows Chrome to
support even graphical Apple or Google style emoji; this is still useful because
Chrome for Windows still does not natively support emoji the way other browsers do, or
even the way Chrome for OS X now does.
