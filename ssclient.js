;(function(){

/**
 * Require the given path.
 *
 * @param {String} path
 * @return {Object} exports
 * @api public
 */

function require(path, parent, orig) {
  var resolved = require.resolve(path);

  // lookup failed
  if (null == resolved) {
    orig = orig || path;
    parent = parent || 'root';
    var err = new Error('Failed to require "' + orig + '" from "' + parent + '"');
    err.path = orig;
    err.parent = parent;
    err.require = true;
    throw err;
  }

  var module = require.modules[resolved];

  // perform real require()
  // by invoking the module's
  // registered function
  if (!module._resolving && !module.exports) {
    var mod = {};
    mod.exports = {};
    mod.client = mod.component = true;
    module._resolving = true;
    module.call(this, mod.exports, require.relative(resolved), mod);
    delete module._resolving;
    module.exports = mod.exports;
  }

  return module.exports;
}

/**
 * Registered modules.
 */

require.modules = {};

/**
 * Registered aliases.
 */

require.aliases = {};

/**
 * Resolve `path`.
 *
 * Lookup:
 *
 *   - PATH/index.js
 *   - PATH.js
 *   - PATH
 *
 * @param {String} path
 * @return {String} path or null
 * @api private
 */

require.resolve = function(path) {
  if (path.charAt(0) === '/') path = path.slice(1);

  var paths = [
    path,
    path + '.js',
    path + '.json',
    path + '/index.js',
    path + '/index.json'
  ];

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    if (require.modules.hasOwnProperty(path)) return path;
    if (require.aliases.hasOwnProperty(path)) return require.aliases[path];
  }
};

/**
 * Normalize `path` relative to the current path.
 *
 * @param {String} curr
 * @param {String} path
 * @return {String}
 * @api private
 */

require.normalize = function(curr, path) {
  var segs = [];

  if ('.' != path.charAt(0)) return path;

  curr = curr.split('/');
  path = path.split('/');

  for (var i = 0; i < path.length; ++i) {
    if ('..' == path[i]) {
      curr.pop();
    } else if ('.' != path[i] && '' != path[i]) {
      segs.push(path[i]);
    }
  }

  return curr.concat(segs).join('/');
};

/**
 * Register module at `path` with callback `definition`.
 *
 * @param {String} path
 * @param {Function} definition
 * @api private
 */

require.register = function(path, definition) {
  require.modules[path] = definition;
};

/**
 * Alias a module definition.
 *
 * @param {String} from
 * @param {String} to
 * @api private
 */

require.alias = function(from, to) {
  if (!require.modules.hasOwnProperty(from)) {
    throw new Error('Failed to alias "' + from + '", it does not exist');
  }
  require.aliases[to] = from;
};

/**
 * Return a require function relative to the `parent` path.
 *
 * @param {String} parent
 * @return {Function}
 * @api private
 */

require.relative = function(parent) {
  var p = require.normalize(parent, '..');

  /**
   * lastIndexOf helper.
   */

  function lastIndexOf(arr, obj) {
    var i = arr.length;
    while (i--) {
      if (arr[i] === obj) return i;
    }
    return -1;
  }

  /**
   * The relative require() itself.
   */

  function localRequire(path) {
    var resolved = localRequire.resolve(path);
    return require(resolved, parent, path);
  }

  /**
   * Resolve relative to the parent.
   */

  localRequire.resolve = function(path) {
    var c = path.charAt(0);
    if ('/' == c) return path.slice(1);
    if ('.' == c) return require.normalize(p, path);

    // resolve deps by returning
    // the dep in the nearest "deps"
    // directory
    var segs = parent.split('/');
    var i = lastIndexOf(segs, 'deps') + 1;
    if (!i) i = 0;
    path = segs.slice(0, i + 1).join('/') + '/deps/' + path;
    return path;
  };

  /**
   * Check if module is defined at `path`.
   */

  localRequire.exists = function(path) {
    return require.modules.hasOwnProperty(localRequire.resolve(path));
  };

  return localRequire;
};
require.register("mkuklis-simplesocket/index.js", function(exports, require, module){
module.exports = SimpleSocket;

function SimpleSocket(url, protocols, options) {
  this.options = options || {};
  this.url = url;
  this.protocols = protocols;
  this.reconnectDelay = this.options.reconnectDelay || 500;
  this.closeDelay = this.options.closeDelay || 2000;
  this.currentDelay = this.reconnectDelay;

  this.readyState = WebSocket.CONNECTING;
  this.forcedClose = false;
  this.timedOut = false;

  this.connect();
}

SimpleSocket.prototype.connect = function (reconnect) {
  var self = this;

  if (WebSocket.length == 3) {
    this.socket = new WebSocket(this.url, this.protocols, this.options);
  }
  else if (this.protocols) {
    this.socket = new WebSocket(this.url, this.protocols);
  }
  else {
    this.socket = new WebSocket(this.url);
  }

  this.onconnecting && this.onconnecting();

  var closeIntervalId = setTimeout(function () {
    self.timedOut = true;
    self.socket.close();
    self.timedOut = false;
  }, this.closeDelay);

  this.socket.onopen = function (event) {
    clearTimeout(closeIntervalId);

    self.readyState = WebSocket.OPEN;
    reconnect = false;
    self.currentDelay = self.reconnectDelay;

    self.onopen && self.onopen(event);
  }
  
  this.socket.onclose = function (event) {
    clearTimeout(closeIntervalId);
    self.socket = null;

    if (self.forcedClose) {
      self.readyState = WebSocket.CLOSED;
      self.onclose && self.onclose(event);
      self.currentDelay = self.reconnectDelay;
    } 
    else {
      self.readyState = WebSocket.CONNECTING;
      self.onconnecting && self.onconnecting();
      
      if (!reconnect && !self.timedOut) {
        self.onclose && self.onclose(event);
        self.currentDelay = self.reconnectDelay;
      }

      setTimeout(function () {
        self.connect(true);
        self.currentDelay *= 2;

      }, self.currentDelay);
    }
  }

  this.socket.onmessage = function (event) {
    self.onmessage && self.onmessage(event);
  }

  this.socket.onerror = function (event) {
    self.onerror && self.onerror(event);
  }
}

SimpleSocket.prototype.send = function (data) {
  if (this.socket) {
    return this.socket.send(data);
  }
}

SimpleSocket.prototype.close = function () {
  this.forcedClose = true;
  
  if (this.socket) {
    this.socket.close();
  }
}

SimpleSocket.prototype.refresh = function () {
  if (this.socket) {
    this.socket.close();
  }
}
});
require.register("component-indexof/index.js", function(exports, require, module){
module.exports = function(arr, obj){
  if (arr.indexOf) return arr.indexOf(obj);
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === obj) return i;
  }
  return -1;
};
});
require.register("component-emitter/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var index = require('indexof');

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks[event] = this._callbacks[event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  var self = this;
  this._callbacks = this._callbacks || {};

  function on() {
    self.off(event, on);
    fn.apply(this, arguments);
  }

  fn._off = on;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks[event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks[event];
    return this;
  }

  // remove specific handler
  var i = index(callbacks, fn._off || fn);
  if (~i) callbacks.splice(i, 1);
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks[event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks[event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

});
require.register("simplesocket-client/index.js", function(exports, require, module){
var Emitter = require('emitter');
var SimpleSocket = require('simplesocket');

var client = module.exports = {};

Emitter(client);

client.connect = function (url, options) {
  var self = this;
  this.socket = new SimpleSocket(url, undefined, options);
  
  this.socket.onmessage = function (event) {
    try {
      var data = JSON.parse(event.data);

      if (data.name) {
        self.trigger(data.name, data.args);
      }
    }
    catch (error) {
      self.trigger(error, error);
    }
  }
  
  this.socket.onerror = function (event) {
    self.trigger('error', event);
  }

  this.socket.onconnecting = function () {
    self.trigger('connecting');
  }

  this.socket.onclose = function () {
    self.trigger('disconnect');
  }
  
  return this;
}

client.trigger = client.emit;

client.emit = function (name, data) {
  var message = { name: name, args: [ data ] };
  this.socket.send(JSON.stringify(message));
}
});


require.alias("mkuklis-simplesocket/index.js", "simplesocket-client/deps/simplesocket/index.js");
require.alias("mkuklis-simplesocket/index.js", "simplesocket-client/deps/simplesocket/index.js");
require.alias("mkuklis-simplesocket/index.js", "simplesocket/index.js");
require.alias("mkuklis-simplesocket/index.js", "mkuklis-simplesocket/index.js");
require.alias("component-emitter/index.js", "simplesocket-client/deps/emitter/index.js");
require.alias("component-emitter/index.js", "emitter/index.js");
require.alias("component-indexof/index.js", "component-emitter/deps/indexof/index.js");

require.alias("simplesocket-client/index.js", "simplesocket-client/index.js");if (typeof exports == "object") {
  module.exports = require("simplesocket-client");
} else if (typeof define == "function" && define.amd) {
  define(function(){ return require("simplesocket-client"); });
} else {
  this["ssclient"] = require("simplesocket-client");
}})();