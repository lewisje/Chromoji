// ==UserScript==
// @author James Edward Lewis II
// @description This makes the browser support emoji by using native fonts if possible and a fallback if not.
// @name Emoji Polyfill
// @namespace greasyfork.org
// @version 1.0.19
// @icon https://rawgit.com/lewisje/Chromoji/simple/icon16.png
// @include *
// @license MIT
// @grant none
// @run-at document-start
// @copyright 2015 James Edward Lewis II
// ==/UserScript==

/*!
 * Shim for MutationObserver interface
 * Author: Graeme Yeates (github.com/megawac)
 * Repository: https://github.com/megawac/MutationObserver.js
 * License: WTFPL V2, 2004 (wtfpl.net).
 * Though credit and staring the repo will make me feel pretty, you can modify and redistribute as you please.
 * Attempts to follow spec (http:// www.w3.org/TR/dom/#mutation-observers) as closely as possible for native javascript
 * See https://github.com/WebKit/webkit/blob/master/Source/WebCore/dom/MutationObserver.cpp for current webkit source c++ implementation
 */
/**
 * prefix bugs:
    - https://bugs.webkit.org/show_bug.cgi?id=85161
    - https://bugzilla.mozilla.org/show_bug.cgi?id=749920
 * Don't use WebKitMutationObserver as Safari (6.0.5-6.1) use a buggy implementation
*/
window.MutationObserver = window.MutationObserver || window.MozMutationObserver || (function (undefined) {
  'use strict';
  /**
   * @param {function(Array.<MutationRecord>, MutationObserver)} listener
   * @constructor
   */
  function MutationObserver(listener) {
    /**
     * @type {Array.<Object>}
     * @private
     */
    this._watched = [];
    /** @private */
    this._listener = listener;
  }
  /**
   * Start a recursive timeout function to check all items being observed for mutations
   * @type {MutationObserver} observer
   * @private
   */
  function startMutationChecker(observer) {
    (function check() {
      var mutations = observer.takeRecords();
      if (mutations.length) // fire away
        // calling the listener with context is not spec but currently consistent with FF and WebKit
        observer._listener(mutations, observer);
      /** @private */
      observer._timeout = setTimeout(check, MutationObserver._period);
    })();
  }
  /**
   * Period to check for mutations (~32 times/sec)
   * @type {number}
   * @expose
   */
  MutationObserver._period = 30; /*ms+runtime*/
  /**
   * Exposed API
   * @expose
   * @final
   */
  MutationObserver.prototype = {
    /**
     * see http:// dom.spec.whatwg.org/#dom-mutationobserver-observe
     * not going to throw here but going to follow the current spec config sets
     * @param {Node|null} $target
     * @param {Object|null} config : MutationObserverInit configuration dictionary
     * @expose
     * @return undefined
     */
    observe: function($target, config) {
      /**
       * Using slightly different names so closure can go ham
       * @type {!Object} : A custom mutation config
       */
      var settings = {
        attr: !!(config.attributes || config.attributeFilter || config.attributeOldValue),
        // some browsers are strict in their implementation that config.subtree and childList must be set together. We don't care - spec doesn't specify
        kids: !!config.childList, descendents: !!config.subtree,
        charData: !!(config.characterData || config.characterDataOldValue)
      }, watched = this._watched;
      // remove already observed target element from pool
      for (var i = 0; i < watched.length; i++)
        if (watched[i].tar === $target) watched.splice(i, 1);
      if (config.attributeFilter)
        /**
         * converts to a {key: true} dict for faster lookup
         * @type {Object.<String,Boolean>}
         */
        settings.afilter = reduce(config.attributeFilter, function(a, b) {
          a[b] = true;
          return a;
        }, {});
      watched.push({
        tar: $target,
        fn: createMutationSearcher($target, settings)
      });
      // reconnect if not connected
      if (!this._timeout) startMutationChecker(this);
    },
    /**
     * Finds mutations since last check and empties the "record queue" i.e. mutations will only be found once
     * @expose
     * @return {Array.<MutationRecord>}
     */
    takeRecords: function() {
      var mutations = [], watched = this._watched, wl = watched.length;
      for (var i = 0; i < wl; i++) watched[i].fn(mutations);
      return mutations;
    },
    /**
     * @expose
     * @return undefined
     */
    disconnect: function() {
      this._watched = []; // clear the stuff being observed
      clearTimeout(this._timeout); // ready for garbage collection
      /** @private */
      this._timeout = null;
    }
  };
  /**
   * Simple MutationRecord pseudoclass. No longer exposing as its not fully compliant
   * @param {Object} data
   * @return {Object} a MutationRecord
   */
  function MutationRecord(data) {
    var settings = { // technically these should be on proto so hasOwnProperty will return false for non explicitly set props
      type: null, target: null, addedNodes: [], removedNodes: [], previousSibling: null,
      nextSibling: null, attributeName: null, attributeNamespace: null, oldValue: null
    };
    for (var prop in data)
      if (has(settings, prop) && data[prop] !== undefined) settings[prop] = data[prop];
    return settings;
  }
  /**
   * Creates a func to find all the mutations
   *
   * @param {Node} $target
   * @param {!Object} config : A custom mutation config
   */
  function createMutationSearcher($target, config) {
    /** type {Elestuct} */
    var $oldstate = clone($target, config); // create the cloned datastructure
    /**
     * consumes array of mutations we can push to
     *
     * @param {Array.<MutationRecord>} mutations
     */
    return function(mutations) {
      var olen = mutations.length, dirty;
      // Alright we check base level changes in attributes... easy
      if (config.attr && $oldstate.attr)
        findAttributeMutations(mutations, $target, $oldstate.attr, config.afilter);
      // check childlist or subtree for mutations
      if (config.kids || config.descendents)
        dirty = searchSubtree(mutations, $target, $oldstate, config);
      // reclone data structure if theres changes
      if (dirty || mutations.length !== olen)
        /** type {Elestuct} */
        $oldstate = clone($target, config);
    };
  }
  /* attributes + attributeFilter helpers */
  /**
   * fast helper to check to see if attributes object of an element has changed
   * doesnt handle the textnode case
   *
   * @param {Array.<MutationRecord>} mutations
   * @param {Node} $target
   * @param {Object.<string, string>} $oldstate : Custom attribute clone data structure from clone
   * @param {Object} filter
   */
  function findAttributeMutations(mutations, $target, $oldstate, filter) {
    var checked = {}, attributes = $target.attributes, i = attributes.length, attr, name;
    while (i--) {
      attr = attributes[i];
      name = attr.name;
      if (!filter || has(filter, name)) {
        if (attr.value !== $oldstate[name])
          // The pushing is redundant but gzips very nicely
          mutations.push(MutationRecord({
            type: 'attributes', target: $target, attributeName: name, oldValue: $oldstate[name],
            attributeNamespace: attr.namespaceURI // in ie<8 it incorrectly will return undefined
          }));
        checked[name] = true;
      }
    }
    for (name in $oldstate)
      if (!(checked[name]) && $oldstate.hasOwnProperty(name))
        mutations.push(MutationRecord({target: $target, type: 'attributes', attributeName: name, oldValue: $oldstate[name]}));
  }
  /**
   * searchSubtree: array of mutations so far, element, element clone, bool
   * synchronous dfs comparision of two nodes
   * This function is applied to any observed element with childList or subtree specified
   * Sorry this is kind of confusing as shit, tried to comment it a bit...
   * codereview.stackexchange.com/questions/38351 discussion of an earlier version of this func
   *
   * @param {Array} mutations
   * @param {Node} $target
   * @param {!Object} $oldstate : A custom cloned node from clone()
   * @param {!Object} config : A custom mutation config
   */
  function searchSubtree(mutations, $target, $oldstate, config) {
    // Track if the tree is dirty and has to be recomputed (#14).
    var dirty;
    /*
     * Helper to identify node rearrangment and stuff...
     * There is no gaurentee that the same node will be identified for both added and removed nodes
     * if the positions have been shuffled.
     * conflicts array will be emptied by end of operation
     */
    function resolveConflicts(conflicts, node, $kids, $oldkids, numAddedNodes) {
      // the distance between the first conflicting node and the last
      var distance = conflicts.length - 1,
      // prevents same conflict being resolved twice consider when two nodes switch places.
      // only one should be given a mutation event (note -~ is used as a math.ceil shorthand)
        counter = -~((distance - numAddedNodes) / 2), $cur, oldstruct, conflict;
      while (conflict = conflicts.pop()) {
        $cur = $kids[conflict.i];
        oldstruct = $oldkids[conflict.j];
        // attempt to determine if there was node rearrangement... won't gaurentee all matches
        // also handles case where added/removed nodes cause nodes to be identified as conflicts
        if (config.kids && counter && Math.abs(conflict.i - conflict.j) >= distance) {
          mutations.push(MutationRecord({
            type: 'childList', target: node, addedNodes: [$cur], removedNodes: [$cur],
            // haha don't rely on this please
            nextSibling: $cur.nextSibling, previousSibling: $cur.previousSibling
          }));
          counter--; // found conflict
        }
        // Alright we found the resorted nodes now check for other types of mutations
        if (config.attr && oldstruct.attr) findAttributeMutations(mutations, $cur, oldstruct.attr, config.afilter);
        if (config.charData && $cur.nodeType === 3 && $cur.nodeValue !== oldstruct.charData)
          mutations.push(MutationRecord({type: 'characterData', target: $cur}));
        // now look @ subtree
        if (config.descendents) findMutations($cur, oldstruct);
      }
    }
    /**
     * Main worker. Finds and adds mutations if there are any
     * @param {Node} node
     * @param {!Object} old : A cloned data structure using internal clone
     */
    function findMutations(node, old) {
      var $kids = node.childNodes, $oldkids = old.kids, klen = $kids.length,
      // $oldkids will be undefined for text and comment nodes
        olen = $oldkids ? $oldkids.length : 0;
      // if (!olen && !klen) return; // both empty; clearly no changes
      // we delay the intialization of these for marginal performance in the expected case (actually quite signficant on large subtrees when these would be otherwise unused)
      // map of checked element of ids to prevent registering the same conflict twice
      var map,
      // array of potential conflicts (ie nodes that may have been re arranged)
        conflicts, id, // element id from getElementId helper
        idx, // index of a moved or inserted element
        oldstruct,
      // current and old nodes
        $cur, $old,
      // track the number of added nodes so we can resolve conflicts more accurately
        numAddedNodes = 0,
      // iterate over both old and current child nodes at the same time
        i = 0, j = 0;
      // while there is still anything left in $kids or $oldkids (same as i < $kids.length || j < $oldkids.length;)
      while (i < klen || j < olen) {
        // current and old nodes at the indexs
        $cur = $kids[i];
        oldstruct = $oldkids[j];
        $old = oldstruct && oldstruct.node;
        if ($cur === $old) { // expected case - optimized for this case
          // check attributes as specified by config
          if (config.attr && oldstruct.attr) /* oldstruct.attr instead of textnode check */ findAttributeMutations(mutations, $cur, oldstruct.attr, config.afilter);
          // check character data if node is a comment or textNode and it's being observed
          if (config.charData && oldstruct.charData !== undefined && $cur.nodeValue !== oldstruct.charData)
            mutations.push(MutationRecord({type: 'characterData', target: $cur}));
          // resolve conflicts; it will be undefined if there are no conflicts - otherwise an array
          if (conflicts) resolveConflicts(conflicts, node, $kids, $oldkids, numAddedNodes);
          // recurse on next level of children. Avoids the recursive call when there are no children left to iterate
          if (config.descendents && ($cur.childNodes.length || oldstruct.kids && oldstruct.kids.length)) findMutations($cur, oldstruct);
          i++;
          j++;
        } else { // (uncommon case) lookahead until they are the same again or the end of children
          dirty = true;
          if (!map) { // delayed initalization (big perf benefit)
            map = {};
            conflicts = [];
          }
          if ($cur) {
            // check id is in the location map otherwise do a indexOf search
            if (!(map[id = getElementId($cur)])) { // to prevent double checking
              // mark id as found
              map[id] = true;
              // custom indexOf using comparitor checking oldkids[i].node === $cur
              if ((idx = indexOfCustomNode($oldkids, $cur, j)) === -1)
                if (config.kids) {
                  mutations.push(MutationRecord({
                    type: 'childList', target: node,
                    addedNodes: [$cur], // $cur is a new node
                    nextSibling: $cur.nextSibling, previousSibling: $cur.previousSibling
                  }));
                  numAddedNodes++;
                }
              else conflicts.push({i: i, j: idx}); // add conflict
            }
            i++;
          }
          if ($old &&
           // special case: the changes may have been resolved: i and j appear congurent so we can continue using the expected case
           $old !== $kids[i]
          ) {
            if (!(map[id = getElementId($old)])) {
              map[id] = true;
              if ((idx = indexOf($kids, $old, i)) === -1)
                if (config.kids) {
                  mutations.push(MutationRecord({
                    type: 'childList', target: old.node, removedNodes: [$old],
                    nextSibling: $oldkids[j + 1], // praise no indexoutofbounds exception
                    previousSibling: $oldkids[j - 1]
                  }));
                  numAddedNodes--;
                }
              else conflicts.push({i: idx, j: j});
            }
            j++;
          }
        }// end uncommon case
      }// end loop
      // resolve any remaining conflicts
      if (conflicts) resolveConflicts(conflicts, node, $kids, $oldkids, numAddedNodes);
    }
    findMutations($target, $oldstate);
    return dirty;
  }
  /**
   * Utility
   * Clones a element into a custom data structure designed for comparision. https://gist.github.com/megawac/8201012
   *
   * @param {Node} $target
   * @param {!Object} config : A custom mutation config
   * @return {!Object} : Cloned data structure
   */
  function clone($target, config) {
    var recurse = true; // set true so childList we'll always check the first level
    return (function copy($target) {
      var elestruct = {/** @type {Node} */ node: $target};
      // Store current character data of target text or comment node if the config requests
      // those properties to be observed.
      if (config.charData && ($target.nodeType === 3 || $target.nodeType === 8))
        elestruct.charData = $target.nodeValue;
      // its either a element, comment, doc frag or document node
      else {
        // Add attr only if subtree is specified or top level and avoid if
        // attributes is a document object (#13).
        if (config.attr && recurse && $target.nodeType === 1)
          /**
           * clone live attribute list to an object structure {name: val}
           * @type {Object.<string, string>}
           */
          elestruct.attr = reduce($target.attributes, function(memo, attr) {
            if (!config.afilter || config.afilter[attr.name])
              memo[attr.name] = attr.value;
            return memo;
          }, {});
        // whether we should iterate the children of $target node
        if (recurse && ((config.kids || config.charData) || (config.attr && config.descendents)))
          /** @type {Array.<!Object>} : Array of custom clone */
          elestruct.kids = map($target.childNodes, copy);
        recurse = config.descendents;
      }
      return elestruct;
    }($target));
  }
  /**
   * indexOf an element in a collection of custom nodes
   *
   * @param {NodeList} set
   * @param {!Object} $node : A custom cloned node
   * @param {number} idx : index to start the loop
   * @return {number}
   */
  function indexOfCustomNode(set, $node, idx) {
    return indexOf(set, $node, idx, JSCompiler_renameProperty('node'));
  }
  // using a non id (eg outerHTML or nodeValue) is extremely naive and will run into issues with nodes that may appear the same like <li></li>
  var counter = 1, // don't use 0 as id (falsy)
  /** @const */
    expando = 'mo_id';
  /**
   * Attempt to uniquely id an element for hashing. We could optimize this for legacy browsers but it hopefully wont be called enough to be a concern
   *
   * @param {Node} $ele
   * @return {(string|number)}
   */
  function getElementId($ele) {
    try {
      return $ele.id || ($ele[expando] = $ele[expando] || counter++);
    } catch (o_O) { // ie <8 will throw if you set an unknown property on a text node
      try {
        return $ele.nodeValue; // naive
      } catch (shitie) { // when text node is removed: https://gist.github.com/megawac/8355978 :(
        return counter++;
      }
    }
  }
  /**
   * **map** Apply a mapping function to each item of a set
   * @param {Array|NodeList} set
   * @param {Function} iterator
   */
  function map(set, iterator) {
    var results = [], sl = set.length;
    for (var index = 0; index < sl; index++)
      results[index] = iterator(set[index], index, set);
    return results;
  }
  /**
   * **Reduce** builds up a single result from a list of values
   * @param {Array|NodeList|NamedNodeMap} set
   * @param {Function} iterator
   * @param {*} [memo] Initial value of the memo.
   */
  function reduce(set, iterator, memo) {
    var sl = set.length;
    for (var index = 0; index < sl; index++)
      memo = iterator(memo, set[index], index, set);
    return memo;
  }
  /**
   * **indexOf** find index of item in collection.
   * @param {Array|NodeList} set
   * @param {Object} item
   * @param {number} idx
   * @param {string} [prop] Property on set item to compare to item
   */
  function indexOf(set, item, idx, prop) {
    var sl = set.length;
    for (/*idx = ~~idx*/; idx < sl; idx++) // start idx is always given as this is internal
      if ((prop ? set[idx][prop] : set[idx]) === item) return idx;
    return -1;
  }
  /**
   * @param {Object} obj
   * @param {(string|number)} prop
   * @return {boolean}
   */
  function has(obj, prop) {
    return obj[prop] !== undefined; // will be nicely inlined by gcc
  }
  // GCC hack see http://stackoverflow.com/a/23202438/1517919
  function JSCompiler_renameProperty(a) {
    return a;
  }
  return MutationObserver;
})();

(function (window, undefined) {
  'use strict';
  /* jshint elision:true */
  var emo = {
    /*And: ['https://lewisje.github.io/fonts/emojiAnd.eot?#iefix', , 'https://lewisje.github.io/fonts/emojiAnd.woff', , 'https://lewisje.github.io/fonts/emojiAnd.ttf',
      'https://lewisje.github.io/fonts/emojiAnd.svg#emojiAnd'],
    OSns: ['https://lewisje.github.io/fonts/emojiOSns.eot?#iefix', 'https://lewisje.github.io/fonts/emojiOSns.woff2', 'https://lewisje.github.io/fonts/emojiOSns.woff',
      'https://lewisje.github.io/fonts/emojiOSns.otf', 'https://lewisje.github.io/fonts/emojiOSns.ttf', 'https://lewisje.github.io/fonts/emojiOSns.svg#emojiOSns'],
    Sym: ['https://lewisje.github.io/fonts/emojiSym.eot?#iefix', 'https://lewisje.github.io/fonts/emojiSym.woff2', 'https://lewisje.github.io/fonts/emojiSym.woff', ,
      'https://lewisje.github.io/fonts/emojiSym.ttf', 'https://lewisje.github.io/fonts/emojiSym.svg#emojiSym'],*/
    Symb: ['https://lewisje.github.io/fonts/emojiSymb.eot?#iefix', 'https://lewisje.github.io/fonts/emojiSymb.woff2', 'https://lewisje.github.io/fonts/emojiSymb.woff', ,
      'https://lewisje.github.io/fonts/emojiSymb.ttf', 'https://lewisje.github.io/fonts/emojiSymb.svg#emojiSymb']
  }, /* jshint elision:false */ fontEmoRegex = /\s*(?:(?:"|')?Segoe\sUI\s(?:Emoji|Symbol)(?:"|')?|Symbola|EmojiSymb),?/g, headingRegex = /^h[1-6]$/i,
    roughEmoRegex = /[^\s\w\u0000-\u0022\u0024-\u002F\u003A-\u00A8\u00AA-\u00AD\u00AF-\u203B\u2050-\u2116\u3299-\uD7FF\uE537-\uF8FE\uF900-\uFFFF]/,
    textRegex = /^(?:i?frame|link|(?:no)?script|style|textarea)$/i, typs = ['embedded-opentype', 'woff2', 'woff', 'opentype', 'truetype', 'svg'],
    css = ['/* Injected by Emoji Polyfill */'], style = document.createElement('style'), head = document.head || document.getElementsByTagName('head')[0],
      observer = {}, observerConfig, fnt, emofnt, typ, r, NATIVE_MUTATION_EVENTS;
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
  // part of a pair of functions intended to isolate code that kills the optimizing compiler
  // https://github.com/petkaantonov/bluebird/wiki/Optimization-killers
  function functionize(func, arg) {
    switch (typeof func) {
      case 'string':
        return new Function(func, String(arg));
      case 'function':
        return func;
      default:
        return function () {return func;};
    }
  }
  // The first argument to the toCatch callback is the caught error;
  // if toCatch is passed as a string, this argument must be named "e"
  function trial(toTry, toCatch, toFinal) {
    var try1 = functionize(toTry),
      catch1 = functionize(toCatch, 'e'),
      final1 = functionize(toFinal);
    try {try1();}
    catch (e) {catch1(e);}
    finally {final1();}
  }
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
  function contentLoaded(win, fn, cap) {
    var done = false, top = true, doc = win.document, root = doc.documentElement,
      w3c = 'addEventListener' in doc, add = w3c ? 'addEventListener' : 'attachEvent',
      rem = w3c ? 'removeEventListener' : 'detachEvent', pre = w3c ? '' : 'on',
      init = function init(e) {
        if (e.type === 'readystatechange' && doc.readyState !== 'complete') return;
        (e.type === 'load' ? win : doc)[rem](pre + e.type, init, cap);
        if (!done && (done = true)) fn.call(win, e.type || e);
      },
      poll = function poll() {
        try { root.doScroll('left'); } catch(e) { setTimeout(poll, 50); return; }
        init('poll');
      }, capt = w3c && cap;
    if (doc.readyState === 'complete') fn.call(win, 'lazy');
    else {
      if (doc.createEventObject && root.doScroll) {
        try {top = !win.frameElement;} catch(e) {}
        if (top) poll();
      }
      doc[add](pre + 'DOMContentLoaded', init, capt);
      doc[add](pre + 'readystatechange', init, capt);
      win[add](pre + 'load', init, capt);
    }
  }
  // https://gist.github.com/eduardocereto/955642
  function cb_addEventListener(obj, evt, fnc, cap) {
    var capt = 'addEventListener' in window && cap, binder, evnt;
    if (evt === 'DOMContentLoaded') return contentLoaded(window, fnc, capt);
    // W3C model
    if ('addEventListener' in obj) {
      // BBOS6 doesn't support handleEvent, catch and polyfill
      trial(function () {obj.addEventListener(evt, fnc, capt);},
            function () {
              if (typeof fnc === 'object' && 'handleEvent' in fnc) {
                obj.addEventListener(evt, function (e) {
                  // Bind fn as this and set first arg as event object
                  fnc.handleEvent.call(fnc, e);
                }, capt);
              } else throw e;
            });
      obj.addEventListener(evt, fnc, capt);
      return true;
    } else if ('attachEvent' in obj) { // Microsoft Model
      binder = function binder() {return fnc.call(obj, evt);};
      obj.attachEvent('on' + evt, binder);
      return binder;
    } else { // Browser doesn't support W3C or MSFT model, go on with traditional
      evnt = 'on' + evt;
      if (typeof obj[evnt] === 'function') {
        // Object already has a function on traditional
        // Let's wrap it with our own function inside another function
        fnc = (function (f1, f2) {
          return function () {
            f1.apply(this, arguments);
            f2.apply(this, arguments);
          };
        }(obj[evnt], fnc));
      }
      obj[evnt] = fnc;
      return true;
    }
  }
  // https://github.com/lewisje/setImmediate-shim-demo/blob/gh-pages/setImmediate.js
  (function (global, undefined) {
    var noNative, doc, slice, toString, timer, polyfill;
    // See http://codeforhire.com/2013/09/21/setimmediate-and-messagechannel-broken-on-internet-explorer-10/
    function notUseNative() {
      return global.navigator && /Trident/.test(global.navigator.userAgent);
    }
    noNative = notUseNative();
    if (!noNative && (global.msSetImmediate || global.setImmediate)) {
      if (!global.setImmediate) {
        global.setImmediate = global.msSetImmediate;
        global.clearImmediate = global.msClearImmediate;
      }
      return;
    }
    doc = global.document;
    slice = Array.prototype.slice;
    toString = Object.prototype.toString;
    timer = {polyfill: {}, nextId: 1, tasks: {}, lock: false};
    timer.run = function (handleId) {
      var task;
      if (timer.lock) global.setTimeout(timer.wrap(timer.run, handleId), 0);
      else {
        task = timer.tasks[handleId];
        if (task) {
          timer.lock = true;
          trial(task, null, function () {
            timer.clear(handleId);
            timer.lock = false;
          });
        }
      }
    };
    timer.wrap = function(handler) {
      var args = slice.call(arguments, 1);
      return function () {
        if (typeof handler === 'function') handler.apply(undefined, args);
        else functionize(String(handler))();
      };
    };
    timer.create = function(args) {
      timer.tasks[timer.nextId] = timer.wrap.apply(null, args);
      return timer.nextId++;
    };
    timer.clear = function(handleId) {
      delete timer.tasks[handleId];
    };
    timer.polyfill.messageChannel = function () {
      var channel = new global.MessageChannel();
      channel.port1.onmessage = function (event) {
        timer.run(Number(event.data));
      };
      return function () {
        var handleId = timer.create(arguments);
        channel.port2.postMessage(handleId);
        return handleId;
      };
    };
    timer.polyfill.nextTick = function () {
      return function () {
        var handleId = timer.create(arguments);
        global.process.nextTick(timer.wrap(timer.run, handleId));
        return handleId;
      };
    };
    timer.polyfill.postMessage = function () {
      var messagePrefix = 'setImmediate$' + Math.random() + '$',
        onGlobalMessage = function onGlobalMessage(event) {
        if (event.source === global &&
          typeof event.data === 'string' &&
          event.data.indexOf(messagePrefix) === 0) {
          timer.run(+event.data.slice(messagePrefix.length));
        }
      };
      if (global.addEventListener) global.addEventListener('message', onGlobalMessage, false);
      else global.attachEvent('onmessage', onGlobalMessage);
      return function () {
        var handleId = timer.create(arguments);
        global.postMessage(messagePrefix + handleId, '*');
        return handleId;
      };
    };
    timer.polyfill.readyStateChange = function () {
      var html = doc.documentElement;
      return function () {
        var handleId = timer.create(arguments),
          script = doc.createElement('script');
        script.onreadystatechange = function () {
          timer.run(handleId);
          script.onreadystatechange = null;
          html.removeChild(script);
          script = null;
        };
        html.appendChild(script);
        return handleId;
      };
    };
    timer.polyfill.setTimeout = function () {
      return function () {
        var handleId = timer.create(arguments);
        global.setTimeout(timer.wrap(timer.run, handleId), 1);
        return handleId;
      };
    };
    function canUsePostMessage() {
      if (global.postMessage && !global.importScripts) {
        var asynch = true, oldOnMessage = global.onmessage;
        global.onmessage = function () {
          asynch = false;
        };
        global.postMessage('', '*');
        global.onmessage = oldOnMessage;
        return asynch;
      }
    }
    // Don't get fooled by e.g. browserify environments.
    // For Node.js before 0.9
    if (toString.call(global.process) === '[object process]') polyfill = 'nextTick';
    // For non-IE10 modern browsers
    else if (canUsePostMessage()) polyfill = 'postMessage';
    // For web workers, where supported
    else if (!noNative && global.MessageChannel) polyfill = 'messageChannel';
    // For IE 6–8
    else if (doc && ('onreadystatechange' in doc.createElement('script'))) polyfill = 'readyStateChange';
    // For older browsers
    else polyfill = 'setTimeout';
    // If supported, we should attach to the prototype of global,
    // since that is where setTimeout et al. live.
    var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
    attachTo = attachTo && attachTo.setTimeout ? attachTo : global;
    attachTo.setImmediate = timer.polyfill[polyfill]();
    attachTo.setImmediate.usepolyfill = polyfill;
    attachTo.msSetImmediate = attachTo.setImmediate;
    attachTo.clearImmediate = attachTo.msClearImmediate = timer.clear;
  })(window);
  function isEdit(el) {
    var n = el.nodeName.toLowerCase();
    return (n === 'input' && el.type === 'text') ||
      (n === 'textarea') || el.isContentEditable;
  }
  function hasText(el) {
    var nodes = el.childNodes, nl = nodes.length, nam = el.nodeName.toLowerCase(), n;
    if (nl && nam !== 'select' && nam !== 'noframes')
      for (n in nodes)
        if (nodes.hasOwnProperty(n) && nodes[n].nodeType === Node.TEXT_NODE &&
            // /[^\s\w\u0000-\u203B\u2050-\u2116\u3299-\uD83B\uD83F-\uDBFF\uE000-\uFFFD]/
            roughEmoRegex.test(nodes[n].nodeValue))
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
    var font = getStyle(el, 'fontFamily').replace(fontEmoRegex, '') || 'monospace',
      newfont = 'font-family: ' + font + ", 'Segoe UI Emoji', 'Segoe UI Symbol', Symbola, EmojiSymb !important;";
    el.$emoji = true;
    delStyle(el, 'fontFamily');
    if (headingRegex.test(el.nodeName)) {
      el.innerHTML = ['<span style="', newfont, '">', el.innerHTML, '</span>'].join('');
      el.firstChild.$emoji = true;
    }
    else el.style.cssText += '; ' + newfont;
  }
  function fontExtendEdit(e) {
    var evt = e || window.event, el = evt.target;
    if (!el.$emoji && isEdit(el)) fontExtend(el);
  }
  function fontExtendLoad(el) {
    if (!el) return false;
    if (!textRegex.test(el.nodeName) && !isEdit(el)) {
      if (!el.$emoji && hasText(el))
        setImmediate(function () {fontExtend(el);});
      return true;
    }
    return false;
  }
  function fontExtendNode(e) {
    var evt = e || window.event;
    walkTheDOM(evt.target, fontExtendLoad);
  }
  function fontExtender() {
    fontExtendNode({target: document.body});
  }
  function init(e) {
    if (document.removeEventListener) {
      document.removeEventListener('DOMContentLoaded', init, false);
      document.removeEventListener('readystatechange', init, false);
      window.removeEventListener('load', init, false);
    } else if (document.detachEvent) {
      document.detachEvent('onDOMContentLoaded', init);
      document.detachEvent('onreadystatechange', init);
      window.detachEvent('onload', init);
    } else {
      //document.onDOMContentLoaded = null;
      //document.onreadystatechange = null;
      //window.onload = null;
    }
    fontExtender();
    observer.start();
  }
  cb_addEventListener(document, 'focus', fontExtendEdit, true);
  NATIVE_MUTATION_EVENTS = (function () {
    var e, l, f = false, root = document.documentElement;
    l = root.id;
    e = function e() {
      if (root.removeEventListener) root.removeEventListener('DOMAttrModified', e, false);
      else if (root.detachEvent) root.detachEvent('onDOMAttrModified', e);
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
    observer.start = function () {
      observer.observe(document.body, observerConfig);
    };
    observer.stop = function () {
      observer.disconnect();
    };
  } else if (NATIVE_MUTATION_EVENTS) {
    observer.start = function () {
      //cb_addEventListener(document.body, 'DOMAttrModified', onMutation, false);
      //cb_addEventListener(document.body, 'DOMCharacterDataModified', onMutation, false);
      cb_addEventListener(document.body, 'DOMNodeInserted', onMutation, false);
      cb_addEventListener(document.body, 'DOMSubtreeModified', onMutation, false);
    };
    observer.stop = function () {
      if (document.removeEventListener) {
       //document.body.removeEventListener('DOMAttrModified', onMutation, false);
       //document.body.removeEventListener('DOMCharacterDataModified', onMutation, false);
        document.body.removeEventListener('DOMNodeInserted', onMutation, false);
        document.body.removeEventListener('DOMSubtreeModified', onMutation, false);
      } else if (document.detachEvent) {
        //document.body.detachEvent('onDOMAttrModified', onMutation);
        //document.body.detachEvent('onDOMCharacterDataModified', onMutation);
        document.body.detachEvent('onDOMNodeInserted', onMutation);
        document.body.detachEvent('onDOMSubtreeModified', onMutation);
      } else {
        //document.body.onDOMAttrModified = null;
        //document.body.onDOMCharacterDataModified = null;
        document.body.onDOMNodeInserted = null;
        document.body.onDOMSubtreeModified = null;
      }
    };
  } else {
    observer.start = function () {
      cb_addEventListener(document.body, 'propertychange', onMutation, false);
    };
    observer.stop = function () {
      if (document.removeEventListener)
        document.body.removeEventListener('propertychange', onMutation, false);
      else if (document.detachEvent)
        document.body.detachEvent('onpropertychange', onMutation);
      else document.body.onpropertychange = null;
    };
  }
  r = document.readyState;
  if (r === 'complete' || r === 'loaded' || r === 'interactive') init();
  else cb_addEventListener(document, 'DOMContentLoaded', init, false);
})(window);
