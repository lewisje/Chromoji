(function emojiInsertion(window, undefined) {
  'use strict';
  var walkTheDOM = function walkTheDOM(node, func) {
      if (func(node)) {
        node = node.firstChild;
        while (node) {
          walkTheDOM(node, func);
          node = node.nextSibling;
        }
      }
    }, isEdit = function isEdit(el) {
      var n = el.nodeName.toLowerCase();
      return (n === 'input' && el.type === 'text') ||
        (n === 'textarea') || el.isContentEditable;
    }, hasText = function hasText(el) {
      var nodes = el.childNodes, nl = nodes.length, n;
      if (nl)
        for (n in nodes)
          if (nodes.hasOwnProperty(n) && nodes[n].nodeType === Node.TEXT_NODE &&
              /[^\s\w\u0000-\u203B\u2050-\u2116\u3299-\uD7FF\uE537-\uFFFD]/
              .test(nodes[n].nodeValue))
            return true; // /[^\s\w\u0000-\u0022\u0024-\u002F\u003A-\u00A8\u00AA-\u00AD
      return false; // \u00AF-\u203B\u2050-\u2116\u3299-\uD7FF\uE537-\uF8FE\uF900-\uFFFF]/
    }, fontExtend = function fontExtend(el) {
      var font = window.getComputedStyle(el, '').fontFamily || 'monospace',
        newfont = ['font-family: ', font, ", 'Segoe UI Emoji', 'Segoe UI Symbol', ",
          'Symbola, emojiSymb, emojiOSns, emojiSym, emojiAnd !important;'].join('');
      el.$emoji = true;
      el.style.removeProperty('fontFamily');
      if (/^h[1-6]$/i.test(el.nodeName)) {
        el.innerHTML = ['<span style="', newfont, '">', el.innerHTML, '</span>'].join('');
        el.firstChild.$emoji = true;
      }
      else el.style.cssText += '; ' + newfont;
    }, fontExtendEdit = function fontExtendEdit(e) {
      e = e || window.event;
      var el = e.target;
      if (!el.$emoji && isEdit(el)) fontExtend(el);
    }, fontExtendLoad = function fontExtendLoad(el) {
      if (!el) return false;
      var n = el.nodeName.toLowerCase();
      if (n !== 'script' && n !== 'stylesheet' && n !== 'link' && !isEdit(el)) {
        if (!el.$emoji && hasText(el))
          setImmediate(function ext() {fontExtend(el);});
        return true;
      }
      return false;
    }, fontExtendNode = function fontExtendNode(e) {
      e = e || window.event;
      walkTheDOM(e.target,fontExtendLoad);
    }, fontExtender = function fontExtender() {
      fontExtendNode({target: document.body});
    }, init = function init(e) {
      fontExtender();
      observer.start();
    }, onMutation = function onMutation(mutations) {
      observer.stop();
      fontExtender();
      observer.start();
    }, observer, observerConfig, r;
  document.addEventListener('focus', fontExtendEdit, true);
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
      global.addEventListener('message', onGlobalMessage, false);
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
    // If supported, we should attach to the prototype of global,
    // since that is where setTimeout et al. live.
    var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
    attachTo = attachTo && attachTo.setTimeout ? attachTo : global;
    if (canUsePostMessage())
      installPostMessageImplementation(); // For non-IE10 modern browsers
    else if (global.MessageChannel)
      installMessageChannelImplementation(); // For web workers, where supported
    attachTo.setImmediate = setImmediate;
    attachTo.clearImmediate = clearImmediate;
  }(window));
  if (typeof MutationObserver !== 'function')
    window.MutationObserver = window.WebKitMutationObserver;
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
  r = document.readyState;
  if (r === 'complete' || r === 'loaded' || r === 'interactive') init();
  else document.addEventListener('DOMContentLoaded', init, false);
}(this));
