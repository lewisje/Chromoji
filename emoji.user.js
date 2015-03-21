// ==UserScript==
// @author James Edward Lewis II
// @description This makes the browser support emoji by using native fonts if possible and a fallback if not.
// @name Emoji Polyfill
// @namespace greasyfork.org
// @version 1.0.13
// @icon http://emojipedia.org/wp-content/uploads/2014/07/72x72x1f4d8-microsoft-windows.png.pagespeed.ic.6uXNWSTQVA.png
// @include *
// @grant none
// @run-at document-start
// @copyright 2015 James Edward Lewis II
// ==/UserScript==

(function emojiInsertion(window, undefined) {
  'use strict';
  var emo = {
    And: ['https://lewisje.github.io/fonts/emojiAnd.eot?#iefix', , 'https://lewisje.github.io/fonts/emojiAnd.woff', , 'https://lewisje.github.io/fonts/emojiAnd.ttf'],
    OSns: ['https://lewisje.github.io/fonts/emojiOSns.eot?#iefix', 'https://lewisje.github.io/fonts/emojiOSns.woff2', 'https://lewisje.github.io/fonts/emojiOSns.woff',
      'https://lewisje.github.io/fonts/emojiOSns.otf', 'https://lewisje.github.io/fonts/emojiOSns.ttf', 'https://lewisje.github.io/fonts/emojiOSns.svg#opensansemojiregular'],
    Sym: ['https://lewisje.github.io/fonts/emojiSym.eot?#iefix', 'https://lewisje.github.io/fonts/emojiSym.woff2', 'https://lewisje.github.io/fonts/emojiSym.woff', ,
      'https://lewisje.github.io/fonts/emojiSym.ttf', 'https://lewisje.github.io/fonts/emojiSym.svg#emojisymbolsregular'],
    Symb: ['https://lewisje.github.io/fonts/emojiSymb.eot?#iefix', 'https://lewisje.github.io/fonts/emojiSymb.woff2', 'https://lewisje.github.io/fonts/emojiSymb.woff', ,
      'https://lewisje.github.io/fonts/emojiSymb.ttf', 'https://lewisje.github.io/fonts/emojiSymb.svg#emojisymbolsregular']
  },
    typs = ['embedded-opentype', 'woff2', 'woff', 'opentype', 'truetype', 'svg'], fnt, emofnt, typ, css = ['/* Injected by Emoji Polyfill */'],
    style = document.createElement('style'), head = document.head || document.getElementsByTagName('head')[0], observer = {}, hidden,
      NATIVE_MUTATION_EVENTS, visibilityChange, observerConfig, r;
  for (fnt in emo) if (emo.hasOwnProperty(fnt)) {
    if (fnt === 'Sym') css.push('\n/* Emoji Symbols Font (C) Blockworks - Kenichi Kaneko http://emojisymbols.com/ */');
    css.push('\n@font-face {\n  font-family: "Emoji' + fnt + '";\n  src: local("\u263A\uFE0E")');
    emofnt = emo[fnt];
    for (typ in emofnt) if (!!emofnt[typ] && emofnt.hasOwnProperty(typ)) css.push(',\n       url("' + emofnt[typ] + '") format("' + typs[typ] + '")');
    css.push(';\n}');
  }
  css = css.join('');
  style.type = 'text/css';
  if (style.styleSheet) style.styleSheet.cssText = css;
  else style.appendChild(document.createTextNode(css));
  head.appendChild(style);
  // via Douglas Crockford
  function walkTheDOM(node, func) {
    if (func(node)) {
      node = node.firstChild;
      while (node) {
        walkTheDOM(node, func);
        node = node.nextSibling;
      }
    }
  }
  /*!
   * contentloaded.js
   *
   * Author: Diego Perini (diego.perini at gmail.com)
   * Summary: cross-browser wrapper for DOMContentLoaded
   * Updated: 20101020
   * License: MIT
   * Version: 1.2
   *
   * URL:
   * http://javascript.nwbox.com/ContentLoaded/
   * http://javascript.nwbox.com/ContentLoaded/MIT-LICENSE
   *
   */
  // @win window reference
  // @fn function reference
  function contentLoaded(win, fn, bub) {
    var done = false, top = true, doc = win.document, root = doc.documentElement,
      w3c = !!doc.addEventListener, add = w3c ? 'addEventListener' : 'attachEvent',
      rem = w3c ? 'removeEventListener' : 'detachEvent', pre = w3c ? '' : 'on',
      init = function init(e) {
        if (e.type === 'readystatechange' && doc.readyState !== 'complete') return;
        (e.type === 'load' ? win : doc)[rem](pre + e.type, init, bub);
        if (!done && (done = true)) fn.call(win, e.type || e);
      },
      poll = function poll() {
        try { root.doScroll('left'); } catch(e) { setTimeout(poll, 50); return; }
        init('poll');
      };
    bub = w3c && bub;
    if (doc.readyState === 'complete') fn.call(win, 'lazy');
    else {
      if (doc.createEventObject && root.doScroll) {
        try { top = !win.frameElement; } catch(e) { }
        if (top) poll();
      }
      doc[add](pre + 'DOMContentLoaded', init, bub);
      doc[add](pre + 'readystatechange', init, bub);
      win[add](pre + 'load', init, bub);
    }
  }
  function cb_addEventListener(obj, evt, fnc, bub) {
    bub = !window.addEventListener || bub;
    if (evt === 'DOMContentLoaded') return contentLoaded(window, fnc, bub);
    // W3C model
    if (obj.addEventListener) {
      obj.addEventListener(evt, fnc, bub);
      return true;
    } 
    // Microsoft model
    else if (obj.attachEvent) {
      return obj.attachEvent('on' + evt, function binder() {return fnc.call(obj, evt);});
    } else { // Browser doesn't support W3C or MSFT model, go on with traditional
      evt = 'on' + evt;
      if (typeof obj[evt] === 'function') {
        // Object already has a function on traditional
        // Let's wrap it with our own function inside another function
        fnc = (function wrapper(f1, f2) {
          return function wrapped() {
            f1.apply(this, arguments);
            f2.apply(this, arguments);
          };
        }(obj[evt], fnc));
      }
      obj[evt] = fnc;
      return true;
    }
  }
  /*function cb_preventDefault(evt) {
    if (evt.preventDefault) evt.preventDefault(); // W3C
    if (evt.returnValue) evt.returnValue = false; // IE 8 and earlier
    return false; // for handlers registered as object properties
  }
  function cb_stopPropagation(evt) {
    if (evt.stopPropagation) evt.stopPropagation(); // W3C
    if (evt.cancelBubble) evt.cancelBubble = true; // IE 8 and earlier
    return true;
  }*/
  // https://github.com/YuzuJS/setImmediate/blob/master/setImmediate.js
  (function (global, undefined) {
    if (global.setImmediate) return;
    var nextHandle = 1, // Spec says greater than zero
      tasksByHandle = {}, currentlyRunningATask = false,
      doc = global.document, setImmediate;
    // This function accepts the same arguments as setImmediate, but
    // returns a function that requires no arguments.
    function partiallyApplied(handler) {
      var args = [].slice.call(arguments, 1);
      return function partiallyApplied() {
        if (typeof handler === 'function') handler.apply(undefined, args);
        /* jshint evil:true */
        else (new Function('' + handler)());
        /* jshint evil:false */
      };
    }
    function clearImmediate(handle) {
        delete tasksByHandle[handle];
    }
    function addFromSetImmediateArguments(args) {
      tasksByHandle[nextHandle] = partiallyApplied.apply(undefined, args);
      return nextHandle++;
    }
    function runIfPresent(handle) {
      // From the spec: "Wait until any invocations of this algorithm
      // started before this one have completed."
      // So if we're currently running a task, we'll need to delay this invocation.
      if (currentlyRunningATask) setTimeout(partiallyApplied(runIfPresent, handle), 0);
        // Delay by doing a setTimeout. setImmediate was tried instead,
        // but in Firefox 7, it generated a "too much recursion" error.
      else {
        var task = tasksByHandle[handle];
        if (task) {
          currentlyRunningATask = true;
          try {
            task();
          } finally {
            clearImmediate(handle);
            currentlyRunningATask = false;
          }
        }
      }
    }
    function installNextTickImplementation() {
      setImmediate = function setImmediate() {
        var handle = addFromSetImmediateArguments(arguments);
        process.nextTick(partiallyApplied(runIfPresent, handle));
        return handle;
      };
    }
    function canUsePostMessage() {
      // The test against `importScripts` prevents this implementation
      // from being installed inside a web worker,
      // where `global.postMessage` means something completely different
      // and can't be used for this purpose.
      if (global.postMessage && !global.importScripts) {
        var postMessageIsAsynchronous = true, oldOnMessage = global.onmessage;
        global.onmessage = function onMsg() {
          postMessageIsAsynchronous = false;
        };
        global.postMessage('', '*');
        global.onmessage = oldOnMessage;
        return postMessageIsAsynchronous;
      }
    }
    function installPostMessageImplementation() {
      // Installs an event handler on `global` for the `message` event: see
      // https://developer.mozilla.org/en/DOM/window.postMessage
      // http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages
      var messagePrefix = 'setImmediate$' + Math.random() + '$',
       onGlobalMessage = function onGlobalMessage(event) {
        if (event.source === global && typeof event.data === 'string' &&
            event.data.indexOf(messagePrefix) === 0)
          runIfPresent(+event.data.slice(messagePrefix.length));
      };
      cb_addEventListener(global, 'message', onGlobalMessage, false);
      setImmediate = function setImmediate() {
        var handle = addFromSetImmediateArguments(arguments);
        global.postMessage(messagePrefix + handle, '*');
        return handle;
      };
    }
    function installMessageChannelImplementation() {
      var channel = new MessageChannel();
      channel.port1.onmessage = function onMsg(event) {
        var handle = event.data;
        runIfPresent(handle);
      };
      setImmediate = function setImmediate() {
        var handle = addFromSetImmediateArguments(arguments);
        channel.port2.postMessage(handle);
        return handle;
      };
    }
    function installReadyStateChangeImplementation() {
      var html = doc.documentElement;
      setImmediate = function setImmediate() {
        var handle = addFromSetImmediateArguments(arguments),
          script = doc.createElement('script');
        // Create a <script> element; its readystatechange event
        // will be fired asynchronously once it is inserted
        // into the document. Do so, thus queuing up the task.
        // Remember to clean up once it's been called.
        script.onreadystatechange = function onready() {
          runIfPresent(handle);
          script.onreadystatechange = null;
          html.removeChild(script);
          script = null;
        };
        html.appendChild(script);
        return handle;
      };
    }
    function installSetTimeoutImplementation() {
      setImmediate = function setImmediate() {
        var handle = addFromSetImmediateArguments(arguments);
        setTimeout(partiallyApplied(runIfPresent, handle), 0);
        return handle;
      };
    }
    // If supported, we should attach to the prototype of global,
    // since that is where setTimeout et al. live.
    var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
    attachTo = attachTo && attachTo.setTimeout ? attachTo : global;
    // Don't get fooled by e.g. browserify environments.
    if ({}.toString.call(global.process) === '[object process]')
      installNextTickImplementation(); // For Node.js before 0.9
    else if (canUsePostMessage())
      installPostMessageImplementation(); // For non-IE10 modern browsers
    else if (global.MessageChannel)
      installMessageChannelImplementation(); // For web workers, where supported
    else if (doc && 'onreadystatechange' in doc.createElement('script'))
      installReadyStateChangeImplementation(); // For IE 6–8
    else installSetTimeoutImplementation(); // For older browsers
    attachTo.setImmediate = setImmediate;
    attachTo.clearImmediate = clearImmediate;
  }(window));
  function isEdit(el) {
    var n = el.nodeName.toLowerCase();
    return (n === 'input' && el.type === 'text') ||
      (n === 'textarea') || el.isContentEditable;
  }
  //Copyright 2009 Nicholas C. Zakas. All rights reserved.
  //MIT Licensed
  /*function timedChunk(items, process, context, callback) {
    var todo = items.concat();   //create a clone of the original
    setImmediate(function chunker() {
      var strt = +new Date();
      do process.call(context, todo.shift());
      while (todo.length > 0 && (+new Date() - strt < 50));
      if (todo.length > 0) setImmediate(chunker);
      else callback(items);
    });
  }*/
  function hasText(el) {
    var nodes = el.childNodes, nl = nodes.length, n;
    if (nl)
      for (n in nodes)
        if (nodes.hasOwnProperty(n) && nodes[n].nodeType === Node.TEXT_NODE &&
            /[^\s\w\u0000-\u203B\u2050-\u2116\u3299-\uD7FF\uE537-\uFFFD]/
            .test(nodes[n].nodeValue))
          return true;
    return false; // /[^\s\w\u0000-\u0022\u0024-\u002F\u003A-\u00A8\u00AA-\u00AD
  }// \u00AF-\u203B\u2050-\u2116\u3299-\uD7FF\uE537-\uF8FE\uF900-\uFFFF]/
  function getStyle(el, cssprop) {
    if (document.defaultView && document.defaultView.getComputedStyle)
      return document.defaultView.getComputedStyle(el, '')[cssprop]; // W3C
    if (el.currentStyle) return el.currentStyle[cssprop]; // IE8 and earlier
    return el.style[cssprop]; // try to get inline style
  }
  function delStyle(el, cssprop) {
    var es = el.style;
    if (es.removeProperty) return es.removeProperty(cssprop);
    if (es.removeAttribute) return es.removeAttribute(cssprop);
    es[cssprop] = '';
    return null;
  }
  function fontExtend(el) {
    var font = getStyle(el, 'fontFamily') || 'monospace',
        newfont = ['font-family: ', font, ", 'Segoe UI Emoji', 'Segoe UI Symbol', ",
                   'EmojiSymb, EmojiOSns, EmojiSym, EmojiAnd !important;'].join('');
    el.$emoji = true;
    delStyle(el, 'fontFamily');
    if (/^h[1-6]$/i.test(el.nodeName)) {
      el.innerHTML = ['<span style="', newfont, '">', el.innerHTML, '</span>'].join('');
      el.firstChild.$emoji = true;
    }
    else el.style.cssText += '; ' + newfont;
  }
  function fontExtendEdit(e) {
    e = e || window.event;
    var el = e.target;
    if (!el.$emoji && isEdit(el)) fontExtend(el);
  }
  function fontExtendLoad(el) {
    if (!el) return false;
    var n = el.nodeName.toLowerCase();
    if (n !== 'script' && n !== 'stylesheet' && n !== 'link' && !isEdit(el)) {
      if (!el.$emoji && hasText(el))
        setImmediate(function ext() {fontExtend(el);});
      return true;
    }
    return false;
  }
  function fontExtendNode(e) {
    e = e || window.event;
    walkTheDOM(e.target, fontExtendLoad);
  }
  function fontExtender() {
    fontExtendNode({target: document.body});
  }
  function init(e) {
    fontExtender();
    observer.start();
  }
  /*if (typeof document.hidden !== 'undefined') {
	hidden = 'hidden';
	visibilityChange = 'visibilitychange';
  } else if (typeof document.webkitHidden !== 'undefined') {
	hidden = 'webkitHidden';
	visibilityChange = 'webkitvisibilitychange';
  } else if (typeof document.mozHidden !== 'undefined') {
	hidden = 'mozHidden';
	visibilityChange = 'mozvisibilitychange';
  } else if (typeof document.msHidden !== 'undefined') {
	hidden = 'msHidden';
	visibilityChange = "msvisibilitychange";
  } else {
    hidden = 'visible';
    visibilityChange = 'change';
  }*/
  //cb_addEventListener(document, visibilityChange, fontExtendNode, false);
  //cb_addEventListener(document, 'click', fontExtendNode, false);
  //cb_addEventListener(document, 'mousemove', fontExtendNode, false);
  cb_addEventListener(document, 'focus', fontExtendEdit, true);
  if (typeof MutationObserver !== 'function')
    window.MutationObserver = window.WebKitMutationObserver || window.MozMutationObserver;
  NATIVE_MUTATION_EVENTS = (function testMutations() {
    var e, l, f = false, root = document.documentElement;
    l = root.id;
    e = function e() {
      if (root.removeEventListener) root.removeEventListener('DOMAttrModified', e, false);
      else if (root.detachEvent) root.detachEvent('DOMAttrModified', e);
      else root.onDomAttrModified = null;
      NATIVE_MUTATION_EVENTS = true;
      root.id = l;
    };
    cb_addEventListener(root, 'DOMAttrModified', e, false);
    // now modify a property
    root.id = 'nw';
    f = (root.id !== 'nw');
    root.id = l;
    return f;
  }());
  function onMutation(mutations) {
    observer.stop();
    fontExtender();
    observer.start();
  }
  if (MutationObserver) {
    observer = new MutationObserver(onMutation);
    observerConfig = {
      attributes: false,
      characterData: false,
      childList: true,
      subtree: true
    };
    observer.start = function start() {
      observer.observe(document.body, observerConfig);
    };
    observer.stop = function stop() {
      observer.disconnect();
    };
  } else if (NATIVE_MUTATION_EVENTS) {
    observer.start = function start() {
      //cb_addEventListener(document.body, 'DOMAttrModified', onMutation, false);
      //cb_addEventListener(document.body, 'DOMCharacterDataModified', onMutation, false);
      cb_addEventListener(document.body, 'DOMNodeInserted', onMutation, false);
      cb_addEventListener(document, 'DOMSubtreeModified', onMutation, false);
    };
    observer.stop = function stop() {
      if (document.removeEventListener) {
       //document.body.removeEventListener('DOMAttrModified', onMutation, false);
       //document.body.removeEventListener('DOMCharacterDataModified', onMutation, false);
        document.body.removeEventListener('DOMNodeInserted', onMutation, false);
        document.body.removeEventListener('DOMSubtreeModified', onMutation, false);
      } else if (document.detachEvent) {
        //document.body.detachEvent('DOMAttrModified', onMutation);
        //document.body.detachEvent('DOMCharacterDataModified', onMutation);
        document.body.detachEvent('DOMNodeInserted', onMutation);
        document.body.detachEvent('DOMSubtreeModified', onMutation);
      } else {
        //document.body.onDOMAttrModified = null;
        //document.body.onDOMCharacterDataModified = null;
        document.body.onDOMNodeInserted = null;
        document.body.onDOMSubtreeModified = null;
      }
    };
  } else {
    observer.start = function start() {
      cb_addEventListener(document.body, 'propertychange', onMutation, false);
    };
    observer.stop = function stop() {
      if (document.removeEventListener)
        document.body.removeEventListener('propertychange', onMutation, false);
      else if (document.detachEvent)
        document.body.detachEvent('propertychange', onMutation);
      else document.body.onpropertychange = null;
    };
  }
  r = document.readyState;
  if (r === 'complete' || r === 'loaded' || r === 'interactive') init();
  else cb_addEventListener(document, 'DOMContentLoaded', init, false);
  //cb_addEventListener(document, 'readystatechange', init, false);
  //cb_addEventListener(window, 'load', init, false);
}(window));
