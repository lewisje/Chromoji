Emoji Polyfill
========

This is a UserScript that adds support for textual emoji, based on the Unicode standard: http://www.unicode.org/charts/PDF/U1F300.pdf
A good test page is located on Wikipedia: https://en.wikipedia.org/wiki/Emoji

Go here to install the UserScript: https://greasyfork.org/en/scripts/8598-emoji-polyfill

Go here to install the extension: https://chrome.google.com/webstore/detail/emoji-polyfill/kaplhmhahkanhjahbdbaamdaililfmkj

Emoji Polyfill can also be installed as a bookmarklet:
```javascript
javascript:(function(d){'use%20strict';var%20ss=['//greasyfork.org/scripts/8598-emoji-polyfill/code/Emoji%20Polyfill.user.js'],body=d.body||d.getElementsByTagName('body')[0]||d.getElementsByTagName('frameset')[0],s,i;for(i=ss.length;i--;){s=d.createElement('script');s.src=ss[i];d.body.appendChild(s);}})(document);
```

This is a fork of Chromoji by Locomojis, a Google Chrome extension that allows Chrome to
support even graphical Apple or Google style emoji; this is still useful because
Chrome for Windows still does not natively support emoji the way other browsers do, or
even the way Chrome for OS X now does.

This UserScript will be updated so that it tries to work even in slightly older environments,
like Internet Explorer 8 and earlier using IE7Pro; also, even for newer operating systems, it
will fill in support for the latest emojis while the platforms themselves don't support them
in their default fallback fonts.
