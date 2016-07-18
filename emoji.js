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
if (typeof window.MutationObserver !== 'function') Object.defineProperty(window, 'MutationObserver', {value: (function _setup(window, undefined) {
  'use strict';
  var hasOwn = Object.hasOwnProperty;
  /**
   * @param {function(Array.<mutationRecord>, MutationObserver)} listener
   * @constructor
   */
  function MutationObserver(listener) {
    /**
     * @type {Array.<Object>}
     * @private
     */
    if (!(this instanceof MutationObserver)) return new MutationObserver(listener);
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
    function check() {
      var mutations = observer.takeRecords();
      if (mutations.length) // fire away
        // calling the listener with context is not spec but currently consistent with FF and WebKit
        observer._listener(mutations, observer);
      /** @private */
      observer._timeout = setTimeout(check, MutationObserver._period);
    }
    check();
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
    observe: function observe($target, config) {
      /**
       * Using slightly different names so closure can go ham
       * @type {!Object} : A custom mutation config
       */
      var settings = {
        attr: !!(config.attributes || config.attributeFilter || config.attributeOldValue),
        // some browsers are strict in their implementation that config.subtree and childList must be set together. We don't care - spec doesn't specify
        kids: !!config.childList, descendents: !!config.subtree,
        charData: !!(config.characterData || config.characterDataOldValue)
      }, watched = this._watched, i = 0;
      // remove already observed target element from pool
      for (; i < watched.length; i++) if (watched[i].tar === $target) watched.splice(i, 1);
      if (config.attributeFilter)
        /**
         * converts to a {key: true} dict for faster lookup
         * @type {Object.<String,Boolean>}
         */
        settings.afilter = reduce(config.attributeFilter, function truth(a, b) {
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
     * @return {Array.<mutationRecord>}
     */
    takeRecords: function takeRecords() {
      var mutations = [], watched = this._watched, wl = watched.length, i = 0;
      for (; i < wl; i++) watched[i].fn(mutations);
      return mutations;
    },
    /**
     * @expose
     * @return undefined
     */
    disconnect: function disconnect() {
      this._watched = []; // clear the stuff being observed
      clearTimeout(this._timeout); // ready for garbage collection
      /** @private */
      this._timeout = null;
    }
  };
  /**
   * @param {Object} obj
   * @param {(string|number)} prop
   * @return {boolean}
   */
  function has(obj, prop) {
    return hasOwn.call(obj, prop) && typeof obj[prop] !== 'undefined'; // will be nicely inlined by gcc
  }
  /**
   * Simple mutationRecord pseudoclass. No longer exposing as its not fully compliant
   * @param {Object} data
   * @return {Object} a mutationRecord
   */
  function mutationRecord(data) {
    var settings = { // technically these should be on proto so hasOwnProperty will return false for non explicitly set props
      type: null, target: null, addedNodes: [], removedNodes: [], previousSibling: null,
      nextSibling: null, attributeName: null, attributeNamespace: null, oldValue: null
    }, prop;
    for (prop in data) if (has(settings, prop) && has(data, prop)) settings[prop] = data[prop];
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
     * @param {Array.<mutationRecord>} mutations
     */
    return function mutationSearcher(mutations) {
      var olen = mutations.length, dirty;
      // Alright we check base level changes in attributes... easy
      if (config.attr && $oldstate.attr) findAttributeMutations(mutations, $target, $oldstate.attr, config.afilter);
      // check childlist or subtree for mutations
      if (config.kids || config.descendents) dirty = searchSubtree(mutations, $target, $oldstate, config);
      // reclone data structure if theres changes
      if (dirty || mutations.length !== olen) /** type {Elestuct} */ $oldstate = clone($target, config);
    };
  }
  /* attributes + attributeFilter helpers */
  /**
   * fast helper to check to see if attributes object of an element has changed
   * doesnt handle the textnode case
   *
   * @param {Array.<mutationRecord>} mutations
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
          mutations.push(mutationRecord({
            type: 'attributes', target: $target, attributeName: name, oldValue: $oldstate[name],
            attributeNamespace: attr.namespaceURI // in ie<8 it incorrectly will return undefined
          }));
        checked[name] = true;
      }
    }
    for (name in $oldstate)
      if (!(checked[name]) && $oldstate.hasOwnProperty(name))
        mutations.push(mutationRecord({target: $target, type: 'attributes', attributeName: name, oldValue: $oldstate[name]}));
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
        counter = -~((distance - numAddedNodes) / 2), conflict = conflicts.pop(), $cur, oldstruct;
      while (conflict) {
        $cur = $kids[conflict.i];
        oldstruct = $oldkids[conflict.j];
        // attempt to determine if there was node rearrangement... won't gaurentee all matches
        // also handles case where added/removed nodes cause nodes to be identified as conflicts
        if (config.kids && counter && Math.abs(conflict.i - conflict.j) >= distance) {
          mutations.push(mutationRecord({
            type: 'childList', target: node, addedNodes: [$cur], removedNodes: [$cur],
            // haha don't rely on this please
            nextSibling: $cur.nextSibling, previousSibling: $cur.previousSibling
          }));
          counter--; // found conflict
        }
        // Alright we found the resorted nodes now check for other types of mutations
        if (config.attr && oldstruct.attr) findAttributeMutations(mutations, $cur, oldstruct.attr, config.afilter);
        if (config.charData && $cur.nodeType === 3 && $cur.nodeValue !== oldstruct.charData)
          mutations.push(mutationRecord({type: 'characterData', target: $cur}));
        // now look @ subtree
        if (config.descendents) findMutations($cur, oldstruct);
        conflict = conflicts.pop();
      }
    }
    /**
     * Main worker. Finds and adds mutations if there are any
     * @param {Node} node
     * @param {!Object} old : A cloned data structure using internal clone
     */
    function findMutations(node, old) {
      var $kids = node.childNodes, $oldkids = old.kids, klen = $kids.length,
        olen = $oldkids ? $oldkids.length : 0; // $oldkids will be undefined for text and comment nodes
      // if (!olen && !klen) return; // both empty; clearly no changes
      // we delay the intialization of these for marginal performance in the expected case (actually quite signficant on large subtrees when these would be otherwise unused)
      // map of checked element of ids to prevent registering the same conflict twice
      var map, // array of potential conflicts (ie nodes that may have been re arranged)
        conflicts, id, // element id from getElementId helper
        idx, // index of a moved or inserted element
        oldstruct, $cur, $old, // current and old nodes
        numAddedNodes = 0, // track the number of added nodes so we can resolve conflicts more accurately
        i = 0, j = 0; // iterate over both old and current child nodes at the same time
      while (i < klen || j < olen) { // while there is still anything left in $kids or $oldkids (same as i < $kids.length || j < $oldkids.length;)
        $cur = $kids[i]; // current and old nodes at the indexes
        oldstruct = $oldkids[j];
        $old = oldstruct && oldstruct.node;
        if ($cur === $old) { // expected case - optimized for this case
          // check attributes as specified by config
          if (config.attr && oldstruct.attr) /* oldstruct.attr instead of textnode check */ findAttributeMutations(mutations, $cur, oldstruct.attr, config.afilter);
          // check character data if node is a comment or textNode and it's being observed
          if (config.charData && oldstruct.charData !== undefined && $cur.nodeValue !== oldstruct.charData)
            mutations.push(mutationRecord({type: 'characterData', target: $cur}));
          // resolve conflicts; it will be undefined if there are no conflicts - otherwise an array
          if (conflicts) resolveConflicts(conflicts, node, $kids, $oldkids, numAddedNodes);
          // recurse on next level of children. Avoids the recursive call when there are no children left to iterate
          if (config.descendents && ($cur.childNodes.length || oldstruct.kids && oldstruct.kids.length)) findMutations($cur, oldstruct);
          i++; j++;
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
                  mutations.push(mutationRecord({
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
                  mutations.push(mutationRecord({
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
    function copy($target) {
      var elestruct = {/** @type {Node} */ node: $target};
      // Store current character data of target text or comment node if the config requests
      // those properties to be observed.
      if (config.charData && ($target.nodeType === 3 || $target.nodeType === 8)) elestruct.charData = $target.nodeValue;
      // its either a element, comment, doc frag or document node
      else {
        // Add attr only if subtree is specified or top level and avoid if
        // attributes is a document object (#13).
        if (config.attr && recurse && $target.nodeType === 1)
          /**
           * clone live attribute list to an object structure {name: val}
           * @type {Object.<string, string>}
           */
          elestruct.attr = reduce($target.attributes, function _memo(memo, attr) {
            if (!config.afilter || config.afilter[attr.name]) memo[attr.name] = attr.value;
            return memo;
          }, {});
        // whether we should iterate the children of $target node
        if (recurse && ((config.kids || config.charData) || (config.attr && config.descendents)))
          /** @type {Array.<!Object>} : Array of custom clone */
          elestruct.kids = map($target.childNodes, copy);
        recurse = config.descendents;
      }
      return elestruct;
    }
    return copy($target);
  }
  // GCC hack see http://stackoverflow.com/a/23202438/1517919
  function jsCompiler_renameProperty(a) {
    return a;
  }
  /**
   * **indexOf** find index of item in collection.
   * @param {Array|NodeList} set
   * @param {Object} item
   * @param {number} idx
   * @param {string} [prop] Property on set item to compare to item
   */
  function indexOf(set, item, _idx, prop) {
    var sl = set.length, idx = ~~_idx; // start idx is always given as this is internal
    for (; idx < sl; idx++) if ((prop ? set[idx][prop] : set[idx]) === item) return idx;
    return -1;
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
    return indexOf(set, $node, idx, jsCompiler_renameProperty('node'));
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
    try {return $ele.id || ($ele[expando] = $ele[expando] || counter++);}
    catch (o_O) { // ie <8 will throw if you set an unknown property on a text node
      try {return $ele.nodeValue;} // naive
      catch (shitie) {return counter++;} // when text node is removed: https://gist.github.com/megawac/8355978 :(
    }
  }
  /**
   * **map** Apply a mapping function to each item of a set
   * @param {Array|NodeList} set
   * @param {Function} iterator
   */
  function map(set, iterator) {
    var results = [], sl = set.length, index = 0;
    for (; index < sl; index++) results[index] = iterator(set[index], index, set);
    return results;
  }
  /**
   * **Reduce** builds up a single result from a list of values
   * @param {Array|NodeList|NamedNodeMap} set
   * @param {Function} iterator
   * @param {*} [memo] Initial value of the memo.
   */
  function reduce(set, iterator, mem) {
    var sl = set.length, memo = mem, index = 0;
    for (; index < sl; index++) memo = iterator(memo, set[index], index, set);
    return memo;
  }
  return MutationObserver;
})(window), writable: true, configurable: true});
// Here we begin to insert emojis
(function emojiInsertion(Object, Function, Array, window, document, undefined) {
  'use strict';
  var fontEmoRegex = /\s*(?:(?:"|')?Segoe\sUI\s(?:Emoji|Symbol)(?:"|')?|Symbola|EmojiSymb),?/g,
    roughEmoRegex = /[^\s\w\x00-\x22\x24-\x29\x2B-\x2F\x3A-\u203B\u2050-\u2116\u3040-\u31FF\u3299-\uD83B\uD83F-\uDBFF\uE537-\uF8FE\uF900-\uFFFF]/,
    upperRegex = /[\uD840-\uD869]/g, lowerRegex = /[\uDC00-\uDFFF]/g, surrogate = false, constructorRegex = /\s*class /,
    textRegex = /^(?:i?frame|link|(?:no)?script|style|textarea|#text)$/i, headingRegex = /^h[1-6]$/i,
    hasSymbols = typeof Symbol === 'function' && typeof Symbol() === 'symbol',
    hasToStringTag = hasSymbols && typeof Symbol.toStringTag === 'symbol',
    observerConfig = {
      attributes: false,
      characterData: false,
      childList: true,
      subtree: true
    }, defProp = Object.defineProperty, _toString = Object.prototype.toString, fnToString = Function.prototype.toString,
    setImmediate, emoProp, desc, body, fontExtender, observer, r;
  // part of a pair of functions intended to isolate code that kills the optimizing compiler
  // https://github.com/petkaantonov/bluebird/wiki/Optimization-killers
  function functionize(func, arg) { /* jshint evil: true */
    var typ = typeof func, thunk;
    if ('function' === typ || isCallable(func)) return func;
    if (func && 'string' === typ || ('object' === typ && '[object String]' === _toString.apply(func))) {
      trial(function () {thunk = arg ? new Function(String(arg), func) : new Function(func);}); // jshint evil: true
    }
    thunk = thunk || function thunk() {return func;};
    return thunk;
  }
  // The first argument to the toCatch callback is the caught error;
  // if toCatch is passed as a string, this argument must be named "_"
  function trial(toTry, toCatch, toFinal) {
    var _try = functionize(toTry),
      _catch = functionize(toCatch, '_'),
      _final = functionize(toFinal);
    try {_try();}
    catch (_) {_catch(_);}
    finally {_final();}
  }
  function tryFunctionObject(value) {
    try {fnToString.apply(value); return true;}
    catch (_) {return false;}
  }
  // Reference: https://github.com/ljharb/is-callable/
  function isCallable(fn) {
    var typ = typeof fn, callable = false, strClass;
    if (!fn) return false;
    if ('function' !== typ && 'object' !== typ && 'unknown' !== typ) return false;
    if (constructorRegex.test(fn)) return false; // 'unknown' means callable ActiveX in IE<9
    if (hasToStringTag) return tryFunctionObject(fn);
    strClass = _toString.apply(fn);
    trial(function () {fn.apply(this, new Array(fn.length || 0)); callable = true;});
    return '[object Function]' === strClass || '[object GeneratorFunction]' === strClass || callable;
  }
  function hasMethod(obj, key) {
    return key in obj && isCallable(obj[key]);
  }
  // via Douglas Crockford
  function walk(nod, fnc) {
    var func = functionize(fnc), node = nod;
    if (!func(node)) return;
    node = node.firstChild;
    while (node) {
      walk(node, func);
      node = node.nextSibling;
    }
  }
  // https://github.com/lewisje/setImmediate-shim-demo/blob/gh-pages/setImmediate.js
  setImmediate = (function _setImmediateSetup(Object, Array, global, undefined) {
    var desc, clearDesc, doc, slice, toString, timer, polyfill;
    if (hasMethod(global, 'setImmediate')) return global.setImmediate;
    doc = global.document;
    slice = Array.prototype.slice;
    toString = Object.prototype.toString;
    timer = {polyfill: {}, nextId: 1, tasks: {}, lock: false};
    timer.run = function run(handleId) {
      var task;
      if (timer.lock) global.setTimeout(timer.wrap(timer.run, handleId), 0);
      else {
        task = timer.tasks[handleId];
        if (task) {
          timer.lock = true;
          trial(task, null, function _unlock() {
            timer.clear(handleId);
            timer.lock = false;
          });
        }
      }
    };
    timer.wrap = function wrap(handler) {
      var i = arguments.length - 1, args = i < 0 ? [] : new Array(i),
        func = typeof handler === 'function' ? handler : functionize(String(handler));
      if (i >= 0) while (i--) args[i] = arguments[i + 1];
      return function wrapped() {
        return func.apply(null, args);
      };
    };
    timer.create = function create(args) {
      timer.tasks[timer.nextId] = timer.wrap.apply(null, args);
      return timer.nextId++;
    };
    timer.clear = function clear(handleId) {
      delete timer.tasks[handleId];
    };
    timer.polyfill.messageChannel = function messageChannel() {
      var channel = new global.MessageChannel();
      channel.port1.onmessage = function onmessage(event) {
        timer.run(+event.data);
      };
      return function setImmediate() {
        var i = arguments.length, args = new Array(i), handleId;
        while (i--) args[i] = arguments[i];
        handleId = timer.create(args);
        channel.port2.postMessage(handleId);
        return handleId;
      };
    };
    timer.polyfill.messageChannel = function messageChannel() {
      var channel = new global.MessageChannel();
      channel.port1.onmessage = function onmessage(event) {
        timer.run(+event.data);
      };
      return function setImmediate() {
        var i = arguments.length, args = new Array(i), handleId;
        while (i--) args[i] = arguments[i];
        handleId = timer.create(args);
        channel.port2.postMessage(handleId);
        return handleId;
      };
    };
    timer.polyfill.postMessage = function postMessage() {
      var messagePrefix = 'setImmediate$' + Math.random() + '$';
      global.addEventListener('message', function onGlobalMessage(event) {
        if (event.source === global && typeof event.data === 'string' &&
            event.data.indexOf(messagePrefix) === 0) timer.run(+event.data.slice(messagePrefix.length));
      }, false);
      return function setImmediate() {
        var i = arguments.length, args = new Array(i), handleId;
        while (i--) args[i] = arguments[i];
        handleId = timer.create(args);
        global.postMessage(messagePrefix + handleId, '*');
        return handleId;
      };
    };
    timer.polyfill.setTimeout = function _setTimeout() {
      return function setImmediate() {
        var i = arguments.length, args = new Array(i), handleId;
        while (i--) args[i] = arguments[i];
        handleId = timer.create(args);
        global.setTimeout(timer.wrap(timer.run, handleId), 1);
        return handleId;
      };
    };
    function canUsePostMessage() {
      if (global.postMessage && !global.importScripts) {
        var asynch = true, oldOnMessage = global.onmessage;
        global.onmessage = function _async() {
          asynch = false;
        };
        global.postMessage('', '*');
        global.onmessage = oldOnMessage;
        return asynch;
      }
    }
    if (canUsePostMessage()) polyfill = 'postMessage';
    // For web workers, where supported
    else if (global.MessageChannel) polyfill = 'messageChannel';
    // For older browsers
    else polyfill = 'setTimeout';
    // If supported, we should attach to the prototype of global,
    // since that is where setTimeout et al. live.
    var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
    attachTo = attachTo && hasMethod(attachTo, 'setTimeout') ? attachTo : global;
    desc = {value: timer.polyfill[polyfill](), writable: true, configurable: true};
    defProp(attachTo, 'setImmediate', desc);
    defProp(attachTo.setImmediate, 'usepolyfill', {value: polyfill});
    defProp(attachTo, 'msSetImmediate', desc);
    clearDesc = {value: timer.clear, writable: true, configurable: true};
    defProp(attachTo, 'clearImmediate', clearDesc);
    defProp(attachTo, 'msClearImmediate', clearDesc);
    return desc.value;
  })(Object, Array, window);
  if (hasMethod(window, 'Symbol')) emoProp = Symbol('$emoji$');
  else emoProp = '$emoji$' + (10 * Math.random()) + '$';
  desc = {value: true, writable: true, configurable: true};
  function isEdit(el) {
    var n = el.nodeName.toLowerCase();
    return (n === 'input' && el.type === 'text') ||
      (n === 'textarea') || el.isContentEditable;
  }
  function astralTest(str) {
    if (surrogate) {
      surrogate = upperRegex.test(str);
      return !surrogate && !lowerRegex.test(str);
    }
    surrogate = upperRegex.test(str);
    return !surrogate;
  }
  function hasText(el) {
    var nodes = el.childNodes, n = nodes.length, nam = el.nodeName.toLowerCase(), node, val;
    if (n && nam !== 'select' && nam !== 'noframes')
      while (n--) {
        node = nodes[n];
        val = (node.nodeType === 3) ? node.nodeValue.match(roughEmoRegex) : null;
        if (val && val.length && val.filter(astralTest).join('')) return true;
      }
    return false;
  }
  function fontExtend(el) {
    var font = window.getComputedStyle(el, '').fontFamily.replace(fontEmoRegex, '') ||
      'monospace', newfont = ['font-family: ', font, ", 'Segoe UI Emoji', 'Segoe UI Symbol', ",
                              'Symbola, EmojiSymb !important;'].join('');
    defProp(el, emoProp, desc);
    el.style.removeProperty('fontFamily');
    if (headingRegex.test(el.nodeName)) {
      el.innerHTML = ['<span style="', newfont, '">', el.innerHTML, '</span>'].join('');
      defProp(el.firstChild, emoProp, desc);
    }
    else el.style.cssText += '; ' + newfont;
  }
  function fontExtendEdit(e) {
    var el = e.target;
    if (!el[emoProp] && isEdit(el)) fontExtend(el);
  }
  function fontExtendLoad(el) {
    if (!el) return false;
    if (!textRegex.test(el.nodeName) && !isEdit(el)) {
      if (!el[emoProp] && hasText(el)) setImmediate(fontExtend, el);
      return true;
    }
    return false;
  }
  function fontExtendNode(e) {
    walk(e.target, fontExtendLoad);
  }
  function init(/*e*/) {
    document.removeEventListener('DOMContentLoaded', init, false);
    body = document.body;
    fontExtender = fontExtendNode.bind(null, {target: body});
    fontExtender();
    observer.start();
  }
  function onMutation(mutations) {
    var i = mutations.length, nodes, j;
    observer.stop();
    while (i--) {
      nodes = mutations[i].addedNodes;
      j = nodes.length;
      while (j--) walk(nodes[j], fontExtendLoad);
    }
    observer.start();
  }
  document.addEventListener('focus', fontExtendEdit, true);
  observer = new MutationObserver(onMutation);
  observer.start = function start() {
    observer.start = observer.observe.bind(observer, body, observerConfig);
    observer.start();
  };
  observer.stop = observer.disconnect.bind(observer);
  r = document.readyState;
  if (r === 'complete' || r === 'loaded' || r === 'interactive') init();
  else document.addEventListener('DOMContentLoaded', init, false);
})(Object, Function, Array, this, this.document);
