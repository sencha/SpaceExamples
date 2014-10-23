// This whole block will be removed when built and minified
if (typeof DEBUG === 'undefined') {
    DEBUG = true;

    (function() {
        var scripts = document.getElementsByTagName('script'),
            script = scripts[scripts.length - 1],
            log = console.log,
            warn = console.warn,
            error = console.error,
            pendingLogs = [],
            xhrTimer = null,
            logServer = script.getAttribute('logServer');// || 'http://localhost:9876/log';

        function doLog(message, type) {
            if(!logServer) {
                return;
            }
            
            var Communicator = Ext.space.Communicator;

            if (!xhrTimer) {
                xhrTimer = setTimeout(function() {
                    var xhr = new XMLHttpRequest();

                    xhr.open('POST', logServer, true);
                    xhr.setRequestHeader('Content-Type', 'application/json');
                    xhr.send(JSON.stringify({
                        logs: pendingLogs
                    }));

                    pendingLogs.length = 0;
                    xhrTimer = null;
                }, 500);
            }

            pendingLogs.push({
                timeStamp: Date.now(),
                appId: Communicator.appId,
                device: Communicator.device,
                session: Communicator.session,
                title: document.title,
                url: window.location.href,
                message: message,
                type: type || 'log'
            });
        }

        console.log = function() {
            var message = Array.prototype.slice.call(arguments).join(' ');
            doLog(message, 'log');
            return log && log.apply(console, arguments);
        };

        console.warn = function() {
            var message = Array.prototype.slice.call(arguments).join(' ');
            doLog(message, 'warn');
            return warn && warn.apply(console, arguments);
        };

        console.error = function() {
            var message = Array.prototype.slice.call(arguments).join(' ');
            doLog(message, 'error');
            return error && error.apply(console, arguments);
        };
    })();

    $expectIdSeed = 0;

    $expect = function(name, within, object, method, verifyFn) {
        var fn = object[method],
            expectations, spy, timer, id;

        if (!fn.$isSpy) {
            object[method] = spy = function() {
                var now = Date.now(),
                    i, expectation, verify;

                for (i = expectations.length - 1; i >= 0; i--) {
                    expectation = expectations[i];
                    verify = expectation.verify;

                    if (!verify || verify.apply(object, arguments)) {
                        clearTimeout(expectation.timer);
                        expectations.splice(i, 1);
                        console.log('[EXPECT][' + id + '][END] ' + expectation.name + ' after ' +
                            (now - expectation.time) + 'ms');
                    }
                }

                if (expectations.length === 0) {
                    object[method] = fn;
                }

                return fn.apply(object, arguments);
            };
            spy.$isSpy = true;
            spy.$expectations = expectations = [];
        }
        else {
            spy = fn;
            expectations = spy.$expectations;
        }

        id = ++$expectIdSeed;

        timer = setTimeout(function() {
            var i, ln, expectation, id;

            for (i = 0, ln = expectations.length; i < ln; i++) {
                expectation = expectations[i];
                if (expectation.timer === timer) {
                    id = expectation.id;
                    expectations.splice(i, 1);
                    break;
                }
            }

            console.error('[EXPECT][' + id + '][FAILED]: ' + name + ' within ' + within + 'ms');
        }, within);

        expectations.push({
            id: id,
            name: name,
            time: Date.now(),
            verifyFn: verifyFn,
            timer: timer
        });

        console.log('[EXPECT][' + id + '][START] ' + name + ' within ' + within + 'ms');
    };

    window.onerror = function(message, line, file) {
        console.error('[window.onerror][' + line + '][' + file + '] ' + message);
    }
}

/**
 * @class Ext
 */

/**
 * @property {Boolean} isSpace
 * @readonly
 * True if the application is currently running inside of Sencha Space
 */

/**
 * @property {Boolean} isSpaceReady
 * @readonly
 * True if Sencha Space has fully initialized the webview the application is running in, indicating
 * that it is now safe to call any Space API functions.
 *
 * See also Ext.onSpaceReady
 */

/**
 * @method onSpaceReady
 * @param {Function} callback
 * @return {Ext.Promise}
 */

(function(global) {
    var Ext = global.Ext;

    if (typeof Ext == 'undefined') {
        global.Ext = Ext = {};
    }

    var Base = function() {};

    Base.prototype = {
        constructor: function() {}
    };

    if (!('define' in Ext)) {
        Ext.define = function(name, members) {
            var Class = function() {
                    return this.constructor.apply(this, arguments);
                },
                root = global,
                parts = name.split('.'),
                ln = parts.length - 1,
                leaf = parts[ln],
                statics = members.statics,
                extend = members.extend || Base,
                prototype, key, value, part, i;

            delete members.extend;
            Class.prototype = prototype = Object.create(extend.prototype);
            Class.superclass = prototype.superclass = extend.prototype;

            delete members.statics;

            if (statics) {
                for (key in statics) {
                    value = statics[key];
                    Class[key] = value;
                }
            }

            for (key in members) {
                value = members[key];
                prototype[key] = value;
            }

            if (members.singleton) {
                Class = new Class();
            }

            for (i = 0; i < ln; i++) {
                part = parts[i];
                root = root[part] || (root[part] = {});
            }

            root[leaf] = Class;

            return Class;
        };
    }

    var match = typeof window != 'undefined' && window.navigator.userAgent.match(/SenchaSpace\/([0-9\.]+)/),
        readyListeners = [],
        spaceReady = null; // lazy init because Ext.Promise isn't defined yet

    if (match) {
        Ext.isSpace = true;
        Ext.spaceVersion = match[1];
    }

    if (!('apply' in Ext)) {
        Ext.apply = function(object, config) {
            var key, value;

            for (key in config) {
                value = config[key];
                object[key] = value;
            }

            return object;
        };
    }

    Ext.isSpaceReady = false;
    Ext.onSpaceReady = function(callback, scope) {
        if (!spaceReady) {
            spaceReady = new Ext.Promise();
        }
        if (Ext.spaceIsWindowsPhone) {
            // windows phone might not be ready yet
            setTimeout(function() {
                if (!Ext.isSpace) {
                    spaceReady.reject("Not in Space");
                }
            }, 100);
        } else {
            if (!Ext.isSpace) {
                return spaceReady.reject("Not in Space");
            }
        }
        return callback ? spaceReady.then(callback.bind(scope)) : spaceReady;
    };
    Ext.setSpaceReady = function() {
        if (!spaceReady) {
            spaceReady = new Ext.Promise();
        }
        Ext.isSpaceReady = true;
        spaceReady.fulfill();
    };

    Ext.spaceIsIos = /(iPad|iPhone|iPod)/i.test(window.navigator.userAgent);
    Ext.spaceIsAndroid = /Android/i.test(window.navigator.userAgent);
    Ext.spaceIsBlackBerry = /(BlackBerry|BB10)/i.test(window.navigator.userAgent);
    Ext.spaceIsWindowsPhone = /Windows Phone/i.test(window.navigator.userAgent);
})(this);

/**
 * @private
 *
 * This object handles communication between the WebView and Sencha's native shell.
 * Currently it has two primary responsibilities:
 *
 * 1. Maintaining unique string ids for callback functions, together with their scope objects
 * 2. Serializing given object data into HTTP GET request parameters
 *
 * As an example, to capture a photo from the device's camera, we use `Ext.space.Camera.capture()` like:
 *
 *     Ext.space.Camera.capture(
 *         function(dataUri){
 *             // Do something with the base64-encoded `dataUri` string
 *         },
 *         function(errorMessage) {
 *
 *         },
 *         callbackScope,
 *         {
 *             quality: 75,
 *             width: 500,
 *             height: 500
 *         }
 *     );
 *
 * Internally, `Ext.space.Communicator.send()` will then be invoked with the following argument:
 *
 *     Ext.space.Communicator.send({
 *         command: 'Camera#capture',
 *         callbacks: {
 *             onSuccess: function() {
 *                 // ...
 *             },
 *             onError: function() {
 *                 // ...
 *             }
 *         },
 *         scope: callbackScope,
 *         quality: 75,
 *         width: 500,
 *         height: 500
 *     });
 *
 * Which will then be transformed into a HTTP GET request, sent to native shell's local
 * HTTP server with the following parameters:
 *
 *     ?quality=75&width=500&height=500&command=Camera%23capture&onSuccess=3&onError=5
 *
 * Notice that `onSuccess` and `onError` have been converted into string ids (`3` and `5`
 * respectively) and maintained by `Ext.space.Communicator`.
 *
 * Whenever the requested operation finishes, `Ext.space.Communicator.invoke()` simply needs
 * to be executed from the native shell with the corresponding ids given before. For example:
 *
 *     Ext.space.Communicator.invoke('3', ['DATA_URI_OF_THE_CAPTURED_IMAGE_HERE']);
 *
 * will invoke the original `onSuccess` callback under the given scope. (`callbackScope`), with
 * the first argument of 'DATA_URI_OF_THE_CAPTURED_IMAGE_HERE'
 *
 * Note that `Ext.space.Communicator` maintains the uniqueness of each function callback and
 * its scope object. If subsequent calls to `Ext.space.Communicator.send()` have the same
 * callback references, the same old ids will simply be reused, which guarantee the best possible
 * performance for a large amount of repetitive calls.
 */
Ext.define('Ext.space.Communicator', {
    singleton: true,

    SERVER_URL: 'http://127.0.0.1:30015/', // Change this to the correct server URL

    callbackDataMap: {},

    callbackIdMap: {},

    idSeed: 0,

    globalScopeId: '0',

    constructor: function() {
        this.sendQueue = [];
    },

    init: function(info) {
        var queue = this.sendQueue,
            appId = info.appId,
            device = info.device,
            session = info.session,
            messages = info.messages;

        if (DEBUG && !appId) {
            throw new Error("[Communicator#init] Missing appId");
        }

        if (DEBUG && !device) {
            throw new Error("[Communicator#init] Missing device info");
        }

        if (DEBUG && !session) {
            throw new Error("[Communicator#init] Missing session info");
        }

        if (DEBUG && !messages || !Array.isArray(messages)) {
            throw new Error("[Communicator#init] Missing messages");
        }

        Ext.isSpace = true;

        if (info.version) {
            Ext.spaceVersion = info.version;
        }

        this.device = device;
        this.session = session;
        this.appId = appId;

        Ext.setSpaceReady();

        Ext.space.Invoke.invoke(messages);

        if (queue.length > 0) {
            queue.forEach(function(args) {
                this.send(args);
            }, this);

            queue.length = 0;
        }

        this.watchTitle();
    },

    watchTitle: function() {
        var me = this,
            target = document.querySelector('head > title');

        if (!target) {
            return;
        }

        if (window.WebKitMutationObserver) {
            var observer = new window.WebKitMutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    me.send({
                        command: 'TitleWatcher#update',
                        title: mutation.target.textContent
                    });
                });
            });

            observer.observe(target, { subtree: true, characterData: true, childList: true });
        }
        else {
            target.addEventListener('DOMCharacterDataModified', function() {
                me.send({
                    command: 'TitleWatcher#update',
                    title: document.title
                });
            }, true);
        }
    },

    generateId: function() {
        return String(++this.idSeed);
    },

    getId: function(object) {
        var id = object.$callbackId;

        if (!id) {
            object.$callbackId = id = this.generateId();
        }

        return id;
    },

    getCallbackId: function(callback, scope) {
        var idMap = this.callbackIdMap,
            dataMap = this.callbackDataMap,
            id, scopeId, callbackId, data;

        if (!scope) {
            scopeId = this.globalScopeId;
        }
        else if (scope.isIdentifiable) {
            scopeId = scope.getId();
        }
        else {
            scopeId = this.getId(scope);
        }

        callbackId = this.getId(callback);

        if (!idMap[scopeId]) {
            idMap[scopeId] = {};
        }

        if (!idMap[scopeId][callbackId]) {
            id = this.generateId();
            data = {
                callback: callback,
                scope: scope
            };

            idMap[scopeId][callbackId] = id;
            dataMap[id] = data;
        }

        return idMap[scopeId][callbackId];
    },

    getCallbackData: function(id) {
        return this.callbackDataMap[id];
    },

    invoke: function(id, args) {
        var data = this.getCallbackData(id);

        // If args is a string, assume it is a JSON encoded array and deserialize it.
        if (Object.prototype.toString.call(args) === '[object String]') {
            args = JSON.parse(args);
        }

        data.callback.apply(data.scope, args);
    },

    send: function(args, synchronous) {

       // console.log("invoke.send", args);

        if (!Ext.isSpaceReady) {
            if (synchronous) {
                throw new Error('A synchronous request was made before Space was ready.');
            }

            this.sendQueue.push(args);
            return;
        }

        var callbacks, scope, name, callback;

        if (!args) {
            args = {};
        }
        else if (args.callbacks) {
            callbacks = args.callbacks;
            scope = args.scope;

            delete args.callbacks;
            delete args.scope;

            for (name in callbacks) {
                if (callbacks.hasOwnProperty(name)) {
                    callback = callbacks[name];

                    if (typeof callback == 'function') {
                        args[name] = this.getCallbackId(callback, scope);
                    }
                }
            }
        }

        return this.doSend(args, synchronous);
    },

    doSend: function() {
        if (Ext.spaceIsBlackBerry) {
            return function(args, synchronous) {
                var data = {
                    args: args,
                    appId: this.appId,
                    sync: synchronous
                };

                navigator.cascades.postMessage(window.btoa(JSON.stringify(data)));

                var xhr = new XMLHttpRequest();
                xhr.open('GET', 'getdata', false);
                xhr.send(null);

                var result = xhr.responseText;

                if (result) {
                    return JSON.parse(result);
                }
            }
        }
        else if (Ext.spaceIsAndroid) {
            return function(args, synchronous) {
                var data = {
                    args: args,
                    appId: this.appId,
                    sync: synchronous
                };

                var result;
                
                if(window.Sencha) {
                    result = window.Sencha.action(JSON.stringify(data));
                } else {
                    result = prompt("whatever", "sencha:"+JSON.stringify(data));
                }

                if (!result) {
                    result = '""';
                }

                if (result) {
                    return JSON.parse(result);
                }
            }
        }
        else if (Ext.spaceIsWindowsPhone) {
            return function(args, synchronous) {
                var data = {
                    args: args,
                    appId: this.appId,
                    sync: synchronous
                };

                try {
                    window.external.notify(JSON.stringify(data));
                } catch(e) {}
            };
        }
        else {
            return function(args, synchronous) {
                var response, data, xhr;

                xhr = new XMLHttpRequest();
                xhr.open('POST', this.SERVER_URL + '?_dc=' + new Date().getTime(), !synchronous);
                xhr.setRequestHeader('Content-Type', 'text/plain');

                if (!this.appId) {
                    throw new Error("Missing appId at this point");
                }

                data = {
                    args: args,
                    appId: this.appId,
                    sync: synchronous
                };

                data = JSON.stringify(data);

                if (!synchronous) {
                    xhr.onreadystatechange = function() {
                        if (xhr.readyState == 4) {
                            var status = xhr.status;

                            if (status !== 200) {
                                throw new Error("Failed communicating to native bridge, got status code: " + status + ". " +
                                    "XHR Data: " + data);
                            }
                        }
                    }
                }

                xhr.send(data);

                if (synchronous) {
                    response = xhr.responseText;

                    try {
                        response = JSON.parse(response);
                    }
                    catch (e) {
                    }

                    return response;
                }
            }

        }
    }(),

    notifyReady: function() {
        var Communicator = Ext.space.Communicator,
            communicatorInitId = Communicator.getCallbackId(Communicator.init, Communicator);

        if (Ext.spaceIsIos) {
            window.location = 'sencha://ready.local/' + communicatorInitId;
        }
        else {
            this.doSend({
                command: "ViewStateManager#setOnReady",
                callback: communicatorInitId
            });
        }
    }
});

/**
*  Ext.Promise an Asynchronous API based on the Promises A+ spec http://promisesaplus.com
*
*
*   Promises are used extensively by Space's APIs. Most of Space's APIs return promises. 
*   In the case of Ext.space.Invoke, the called application needs to create, return, and resolve 
*   promises.
*   
*   To understand how promises work, here is a simple promise-based version of setTimeout:
*
*       function wait(time) {
*
*           var promise = new Ext.Promise();
*
*           setTimeout(function(){
*                promise.fulfill({resolved: new Date().getTime()});
*           }, time);
*
*           return promise;
*
*       }
*
*   First create the promise, then return the promise so that the caller can react to the result of the promise.
*   
*   The promise can later be resolved when the data is available:
*   
*       promise.fulfill(response);
*
*   If an error occurs, call reject on the promise:
*   
*       promise.reject(errorMessage);
*
*
*   Now your code can call wait instead of setTimeout:
*
*       wait(1000).then(success, failure);
*
*       var success = function(result) {
*           // Do something with the result
*           console.log("resolved at" + result.resolved);
*       };
*
*       var failure = function(error) {
*           console.error('Something went wrong', error);
*       }
* 
*/
Ext.define('Ext.Promise', {
    statics: {
        when: function() {
            var ret = new this,
                promises = Array.prototype.slice.call(arguments),
                index = -1,
                results = [],
                promise;

            function onRejected(e) {
                ret.reject(e);
            }

            /**
             * @param {*} [result]
             */
            function onFulfilled(result) {
                promise = promises.shift();

                if (index >= 0) {
                    results[index] = result;
                }

                index++;

                if (promise) {
                    promise.then(onFulfilled, onRejected);
                }
                else {
                    ret.fulfill.apply(ret, results);
                }
            }

            onFulfilled();

            return ret;
        },

        whenComplete: function(promises) {
            var ret = new this,
                index = -1,
                fulfilledResults = [],
                rejectedReasons = [],
                promise;

            function onRejected(reason) {
                promise = promises.shift();
                rejectedReasons.push(reason);
                next(promise);
            }

            /**
             * @param [result]
             */
            function onFulfilled(result) {
                promise = promises.shift();
                fulfilledResults.push(result);
                next(promise);
            }

            function next(promise) {
                index++;

                if (promise) {
                    promise.then(onFulfilled, onRejected);
                }
                else {
                    ret.fulfill.call(ret, {
                        fulfilled: fulfilledResults,
                        rejected: rejectedReasons
                    });
                }
            }

            next(promises.shift());

            return ret;
        },

        from: function() {
            var promise = new this;
            promise.completed = 1;
            promise.lastResults = arguments;
            return promise;
        },

        fail: function(reason) {
            var promise = new this;
            promise.completed = -1;
            promise.lastReason = reason;
            return promise;
        }
    },

    completed: 0,

    getListeners: function(init) {
        var listeners = this.listeners;

        if (!listeners && init) {
            this.listeners = listeners = [];
        }

        return listeners;
    },

    then: function(success, error) {
        var Promise = Ext.Promise,
            completed = this.completed,
            promise, result;

        if (completed === -1) {
            if (error) {
                error(this.lastReason);
            }
            return this;
        }

        if (completed === 1 && !this.isFulfilling) {
            if (!success) {
                return this;
            }

            result = success.apply(null, this.lastResults);

            if (result instanceof Promise) {
                promise = result;
            }
            else {
                promise = Promise.from(result);
            }
        }
        else {
            promise = new Promise;
            promise.$owner = this;

            this.getListeners(true).push({
                success: success,
                error: error,
                promise: promise
            });
        }

        return promise;
    },

    error: function(error) {
        return this.then(null, error);
    },

    /**
     *
     * @param {Object...} results
     * @returns {Ext.Promise}
     */
    fulfill: function() {
        var results = arguments,
            listeners, listener, success, promise, callbackResults;

        this.lastResults = results;
        this.completed = 1;

        while (listeners = this.getListeners()) {
            delete this.listeners;
            this.isFulfilling = true;

            while (listener = listeners.shift()) {
                success = listener.success;

                if (success) {
                    promise = listener.promise;
                    delete promise.$owner;

                    callbackResults = success.apply(null, results);

                    if (callbackResults instanceof Ext.Promise) {
                        callbackResults.connect(promise);
                    }
                    else {
                        promise.fulfill(callbackResults);
                    }
                }
            }

            this.isFulfilling = false;
        }

        return this;
    },

    connect: function(promise) {
        var me = this;

        me.then(function(result) {
            this.fulfill(result);
            return result;
        }.bind(promise), promise.reject.bind(promise));
    },

    /**
     *
     * @param {Object} reason
     * @returns {Ext.Promise}
     */
    reject: function(reason) {
        var listeners = this.getListeners(),
            listener, error, promise;

        this.lastReason = reason;
        this.completed = -1;

        if (listeners) {
            delete this.listeners;
            while (listener = listeners.shift()) {
                error = listener.error;
                promise = listener.promise;
                delete promise.$owner;

                if (error) {
                    error(reason);
                }

                promise.reject(reason);
            }
        }

        return this;
    },

    cancel: function() {
        var listeners = this.getListeners(),
            owner = this.$owner,
            i, ln, listener;

        if (listeners) {
            for (i = 0, ln = listeners.length; i < ln; i++) {
                listener = listeners[i];
                listener.promise.cancel();
            }
            listeners.length = 0;
            delete this.listeners;
        }

        if (owner) {
            delete this.$owner;
            owner.cancel();
        }
    }
});

/**
* @private
*/
Ext.define('Ext.space.Observable', {
    constructor: function() {
        this.listeners = [];
    },

    isWatching: false,

    startWatching: function() {},

    invokeListeners: function() {
        var listeners = this.listeners,
            ln = listeners.length,
            i = 0,
            listener;

        for (; i < ln; i++) {
            listener = listeners[i];
            listener[0].apply(listener[1], arguments);
        }
    },

    addListener: function(callback, scope) {
        if (!this.isWatching) {
            this.isWatching = true;
            this.startWatching();
        }

        this.listeners.push(arguments);
    },

    on: function() {
        this.addListener.apply(this, arguments);
    }
});

/**
  @aside guide sensor_apis
 * ## Example
 *
 * You can use the {@link Ext.space.Camera#capture} function to take a photo:
 *
 *     var promise = Ext.space.Camera.capture({
 *         quality: 75,
 *         width: 200,
 *         height: 200,
 *         destination: 'file'
 *     });
 *
 *     promise.then(function(image){ 
            //either URI to the image or data URI of the selected image.
       })
 *
 * See the documentation for {@link Ext.space.Camera#capture} all available configurations.
 */
Ext.define('Ext.space.Camera', {
    singleton: true,

    source: {
        library: 0,
        camera: 1,
        album: 2
    },

    destination: {
        data: 0, // Returns base64-encoded string
        file: 1  // Returns file's URI
    },

    encoding: {
        jpeg: 0,
        jpg: 0,
        png: 1
    },

    /**
     * Allows you to capture a photo.
     *
     * @param {Object} options
     * The options to use when taking a photo.
     *
     * @param {Function} options.success
     * The success callback which is called when the photo has been taken.
     *
     * @param {String} options.success.image
     * The image which was just taken, either a base64 encoded string or a URI depending on which
     * option you chose (destination).
     *
     * @param {Function} options.failure
     * The function which is called when something goes wrong.
     *
     * @param {Object} scope
     * The scope in which to call the `success` and `failure` functions, if specified.
     *
     * @param {Number} options.quality
     * The quality of the image which is returned in the callback. This should be a percentage.
     *
     * @param {String} options.source
     * The source of where the image should be taken. Available options are:
     *
     * - **album** - prompts the user to choose an image from an album
     * - **camera** - prompts the user to take a new photo (default)
     * - **library** - prompts the user to choose an image from the library
     *
     * @param {String} destination
     * The destination of the image which is returned. Available options are:
     *
     * - **data** - returns a base64 encoded string
     * - **file** - returns the file's URI (default)
     *
     * @param {String} encoding
     * The encoding of the returned image. Available options are:
     *
     * - **jpg** (default)
     * - **png**
     *
     * @param {Number} width
     * The width of the image to return
     *
     * @param {Number} height
     * The height of the image to return
     */
    capture: function(options) {
        var sources = this.source,
            
            destinations = this.destination,
            encodings = this.encoding,

            source = options.source || "camera",
            destination = options.destination || "data",
            encoding = options.encoding || "jpg";

        var result = new Ext.Promise();

        if (sources.hasOwnProperty(source)) {
            source = sources[source];
        }

        if (destinations.hasOwnProperty(destination)) {
            destination = destinations[destination];
        }

        if (encodings.hasOwnProperty(encoding)) {
            encoding = encodings[encoding];
        }

        Ext.space.Communicator.send({
            command: 'Camera#capture',
            callbacks: {
                success: function(image){
                    result.fulfill(image);
                },
                failure: function(error){
                    result.reject(error);
                },
            },
            scope: options.scope,
            quality: options.quality,
            width: options.width,
            height: options.height,
            source: source,
            destination: destination,
            encoding: encoding
        });
        return result;
    }
});

/**
  @aside guide sensor_apis
 * This class is used to check if the current device is currently online or not.
 *
 * ## Examples
 *

    Ext.space.Connection.getStatus().then(function(status){
        log("is online" + status.online + " " + status.type)
    });
    
 *
 * The available connection types are:
 *
 * - {@link Ext.space.Connection#UNKNOWN UNKNOWN} - Unknown connection
 * - {@link Ext.space.Connection#ETHERNET ETHERNET} - Ethernet connection
 * - {@link Ext.space.Connection#WIFI WIFI} - WiFi connection
 * - {@link Ext.space.Connection#CELL_2G CELL_2G} - Cell 2G connection
 * - {@link Ext.space.Connection#CELL_3G CELL_3G} - Cell 3G connection
 * - {@link Ext.space.Connection#CELL_4G CELL_4G} - Cell 4G connection
 * - {@link Ext.space.Connection#NONE NONE} - No network connection
 *
 * @mixins Ext.space.connection.Abstract
 *
 * @aside guide native_apis
 */
Ext.define('Ext.space.Connection', {
    extend: Ext.space.Observable,

    singleton: true,

    /**
     * @property {String} UNKNOWN
     * Text label for a connection type.
     */
    UNKNOWN: 'Unknown connection',

    /**
     * @property {String} ETHERNET
     * Text label for a connection type.
     */
    ETHERNET: 'Ethernet connection',

    /**
     * @property {String} WIFI
     * Text label for a connection type.
     */
    WIFI: 'WIFI',

    /**
     * @property {String} CELL_2G
     * Text label for a connection type.
     */
    CELL_2G: 'Cell 2G',

    /**
     * @property {String} CELL_3G
     * Text label for a connection type.
     */
    CELL_3G: 'Cell 3G',

    /**
     * @property {String} CELL_4G
     * Text label for a connection type.
     */
    CELL_4G: 'Cell 4G',

    /**
     * @property {String} NONE
     * Text label for a connection type.
     */
    NONE: 'No network',

    startWatching: function() {
        Ext.space.Communicator.send({
            command: 'Connection#watch',
            callbacks: {
                callback: this.doConnectionChange
            },
            scope: this
        });
    },

    getStatus: function() {
        var result = new Ext.Promise();
        var self = this;
        Ext.space.Communicator.send({
            command: 'Connection#getStatus',
            callbacks: {
                callback: function(status){
                    result.fulfill(self._convertStatus(status));
                }
            }
        });
        return result;
    },

    /**
    *@private
    * converts the raw status object from the bridge into a usable version
    */
    _convertStatus: function(status){
        var isOnline = status.online == "1";
        var type = status.type;
        var typeString = this[status.type]
        return {online: isOnline, type: type, typeString: typeString };
    },

    doConnectionChange: function(e) {
        this.invokeListeners(this._convertStatus(e));
    }
});

/**
 * ## Examples
 *
 * To show a simple notification:
 *
 *     Ext.space.Notification.show({
 *         title: 'Verification',
 *         message: 'Is your email address: test@sencha.com',
 *         buttons: [
                {text: 'Cancel', itemId: 'cancel'},
                {text: 'OK',     itemId: 'ok',  ui : 'action'}
           ],
 *         callback: function(button) {
 *             if (button === "ok") {
 *                 console.log('Verified');
 *             } else {
 *                 console.log('Nope');
 *             }
 *         }
 *     });
 *
 * To make the device vibrate:
 *
 *     Ext.space.Notification.vibrate();
 *
 * @mixins Ext.space.notification.Abstract
 *
 * @aside guide native_apis
 */
Ext.define('Ext.space.Notification', {
    singleton: true,

    show: function(config) {
        Ext.space.Communicator.send({
            command: 'Notification#show',
            callbacks: {
                callback: config.callback
            },
            scope  : config.scope,
            title  : config.title,
            message: config.message,
            buttons: config.buttons.join(',') //@todo fix this
        });
    },

    vibrate: function() {
        Ext.space.Communicator.send({
            command: 'Notification#vibrate'
        });
    }
});


/**
 * This class provides you with a cross platform way of listening to when the the orientation changes on the
 * device your application is running on.
 *
 * The {@link Ext.space.Orientation#orientationchange orientationchange} event gets passes the `alpha`, `beta` and
 * `gamma` values.
 *
 * You can find more information about these values and how to use them on the [W3C device orientation specification](http://dev.w3.org/geo/api/spec-source-orientation.html#deviceorientation).
 *
 * ## Example
 *
 * To listen to the device orientation, you can do the following:
 *
*     Ext.space.Orientation.on({
*         scope: this,
*         orientationchange: function(e) {
*             console.log('Alpha: ', e.alpha);
*             console.log('Beta: ', e.beta);
*             console.log('Gamma: ', e.gamma);
*         }
*     });
 *
 * @mixins Ext.space.orientation.Abstract
 *
 * @aside guide native_apis
 */
Ext.define('Ext.space.Orientation', {
    extend: Ext.space.Observable,

    singleton: true,

    /**
     * From the native shell, the callback needs to be invoked infinitely using a timer, ideally 50 times per second.
     * The callback expects one event object argument, the format of which should looks like this:
     *
     *     {
     *          alpha: 0,
     *          beta: 0,
     *          gamma: 0
     *     }
     *
     * Refer to [Safari DeviceOrientationEvent Class Reference][1] for more details.
     *
     * [1]: http://developer.apple.com/library/safari/#documentation/SafariDOMAdditions/Reference/DeviceOrientationEventClassRef/DeviceOrientationEvent/DeviceOrientationEvent.html
     */
    startWatching: function() {
        Ext.space.Communicator.send({
            command: 'Orientation#watch',
            callbacks: {
                callback: this.doDeviceOrientation
            },
            scope: this
        });
    },

    onDeviceOrientation: function() {
        this.addListener.apply(this, arguments);
    },

    doDeviceOrientation: function(e) {
        this.invokeListeners(e);
    }

    /**
     * @event orientationchange
     * Fired with the device's orientation changes.
     * @param {Object} event
     * @param {Number} event.alpha
     * @param {Number} event.beta
     * @param {Number} event.gamma
     */
});

Ext.define('Ext.space.invoke.Connection', {
    constructor: function(receiverId) {
        this.receiverId = receiverId;
        this.proxyMap = {};
    },

    send: function(message, foreground) {
        return Ext.space.Invoke.send(this.receiverId, message, foreground);
    },

    get: function(name){
    	var proxy = this.proxyMap[name],
    	connection = this;
    	if (!proxy) {
    		proxy = this.proxyMap[name] = Ext.space.Invoke.send(this.receiverId, {"$control": {"action": 'getProxy', 'name':  name}}, false).then(function(obj){
    			 return new Ext.space.invoke.Proxy(connection,name,obj.methods);
    		})
    	}
    	return proxy;
    },

    receive: function(message) {}
});

Ext.define('Ext.space.invoke.Proxy', {
    constructor: function(conection,ObjectName,methods) {
    	this.connection = conection;
    	this.remoteObjectName =ObjectName;

    	for (var i = methods.length - 1; i >= 0; i--) {
    		var method = methods[i];
    		this[method] = this._makeMethod(method);
    	}

    },

    _makeMethod: function(method) {
    	var self = this;

    	return function(options, foreground){
    		return self.connection.send({"$control": {"action": 'callProxy','name' : this.remoteObjectName, 'method': method, options: options} },foreground);
    	}

    }
});

/**
    @aside guide invoke
    The Invoke API allows Applications running inside a Sencha Space client to communicate.
    Applications can securely exchange data with each other.

    When one application requests data from another, that application loads, and the user
    is shown the called app. Once the user is done interacting with the called app,
    the called app returns data back to the calling application, and Sencha Space
    returns the user to the original application.

    The two primary functions for Invoke are Ext.space.Invoke.get and Ext.space.Invoke.onMessage

    For additional information on how to use  please see our [Invoke Guide](#!/guide/invoke) and [example applications](#!/guide/examples)

 */
Ext.define('Ext.space.Invoke', {
    singleton: true,

    messageId: 0,


    /*
    * @private
    */
    constructor: function() {
        this.pendingReceivePromises = {};
        this.connections = {};
        this.connectQueue = [];
        this.messageQueue = [];
        this.proxies = [];
    },


    /*
    * @private
    */
    invoke: function(messages) {
        var me = this;

        if (!Array.isArray(messages)) {
            throw new Error('[Invoke#invoke] Invalid messages, must be an array');
        }

        // Unblock native thread
        setTimeout(function() {
            messages.forEach(function(message) {
                me.onReceived(message);
            });
        }, 1);
    },

    /**
     * Get a connection to another application.

        Ext.space.Invoke.get('photos').then(send, failure);

        var failure = function(error) {
            console.('Received error:', error);
        }

        var send = function(connection) {
            connection.send(data, background).then(
                success,
                failure
            );
        };

     * @param {String} receiverId The ID of the application to connect to. Get this ID from #broadcast
     * @returns {Ext.Promise}
     */
    get: function(broadcastMessage) {
        var connections = this.connections,
            connection = connections[broadcastMessage];

        if (connection) {
            return Ext.Promise.from(connection);
        }
        else {
            return this.broadcast(broadcastMessage).then(function(receiverIds) {
                connections[broadcastMessage] = connection = new Ext.space.invoke.Connection(receiverIds[0].id);
                return connection;
            }.bind(this));
        }
    },

    /**
     * Send a message
     * @private
     * @param {String} receiverId The ID of the application to connect to. Get this ID from #broadcast
     * @param {*} message The message to send, can be an object, as long as it is JSON-able.
     * @param {Boolean} [foreground] Whether or not to bring the receiver app to the foreground.
     * @returns {Ext.Promise}
     */
    send: function(receiverId, message, foreground) {
        var messageId = this.messageId++,
            receivePromise = new Ext.Promise(),
            sendPromise = this.doSend(receiverId, messageId, message, foreground),
            pendingReceivePromises = this.pendingReceivePromises;

        pendingReceivePromises[messageId] = receivePromise;

        sendPromise.error(function(reason) {
            delete pendingReceivePromises[messageId];
            receivePromise.reject(reason);
        });

        return receivePromise;
    },

    /**
     * @private
     * Assign the callback to handle a new connection.
     * The Boolean returned value determines whether or not
     * to accept the connection.
     * @param {Function} callback
     */
    onConnect: function(callback) {
        var queue = this.connectQueue.slice(0),
            i, ln, args;

        this.connectQueue.length = 0;

        if (callback) {
            this.connectCallback = callback;

            for (i = 0, ln = queue.length; i < ln; i++) {
                args = queue[i];
                this.onReceived.apply(this, args);
            }
        }
    },

    /**
    *
    *
    *
    */
    register: function(name, obj) {

        var proxy = this.proxies[name];

        //someone could be waiting for this proxy to be registered
        //if not create a new promise.
        if(!proxy) {
            proxy = new Ext.Promise();
            this.proxies[name] =proxy;
        }

        var temp = {
            name: name,
            methods: []
        };

        /*
        * Extract all the functions from the passed object.
        */
        for(var property in obj) {
            if(obj.propertyIsEnumerable(property) && typeof obj[property] == "function"){
                console.log(property, obj.propertyIsEnumerable(property));
                temp.methods.push(property);
            }
        }

        proxy.fulfill(temp);

    },

    /**
     *   onMessage registers a function to be called each time another application
     *   invokes this application.
     *
     *   For example for the photos application to respond to a request to get photos:
     *
     *       Invoke.onMessage(function(appId, message) {
     *          var promise = new Ext.Promise();
     *
     *          console.log('Got message from ' + appId + ' ' + message);
     *
     *          // Do whatever is needed asynchronously before returning the result
     *          //  (fulfilling the promise)
     *          setTimeout(function(){
     *             promise.fulfill('Yeah I got it');
     *          }, 3000);
     *
     *          return promise;
     *      });
     * @param {Function} callback
     */
    onMessage: function(callback) {
        var queue = this.messageQueue.slice(0),
            i, ln, args;

        this.messageQueue.length = 0;

        if (callback) {
            this.messageCallback = callback;

            for (i = 0, ln = queue.length; i < ln; i++) {
                args = queue[i];
                this.onReceived.apply(this, args);
            }
        }
    },

    /**
     * @private
     */
    onAppConnect: function() {
        return this.connectCallback.apply(this, arguments);
    },

    /**
     * @private
     */
    onAppMessage: function(appId, message) {
        var connection = this.connections[appId],
            response;

        if (connection) {
            response = connection.receive(message);
        }

        if (typeof response == 'undefined') {
            response = this.messageCallback.apply(this, arguments);
        }

        return response;
    },

    /**
     * @private
     */
    onReceived: function(data) {
        var appId = data.appId,
            message = data.message,
            messageId = data.id,
            foreground = data.foreground,
            pendingReceivePromises = this.pendingReceivePromises,
            pendingPromise = pendingReceivePromises[messageId],
            connectCallback = this.connectCallback,
            messageCallback = this.messageCallback,
            response;

        console.log("onReceived", data);

        delete pendingReceivePromises[messageId];



        // A response
        if (pendingPromise) {
            if (message.error) {
                pendingPromise.reject(message.error);
            }
            else {
                pendingPromise.fulfill(message.success);
            }
        }
        // A request
        else {
            try {
                if (message === '__CONNECT__') {
                    if (!connectCallback) {
                        this.connectQueue.push(arguments);
                        return;
                    }
                    else {
                        response = this.onAppConnect(appId);
                    }
                } else if (message.$control){
                    console.log("Got control object!", message);
                    response = this.handleControlMethod(appId, message.$control, messageId, foreground);
                } else {
                    console.log("messageCallback", messageCallback, appId, message);

                    if (!messageCallback) {
                        this.messageQueue.push(arguments);
                        return;
                    }
                    else {
                        response = this.onAppMessage(appId, message);
                    }
                }

                var invoke = this;
                console.log("response", response);
                if (response instanceof Ext.Promise) {
                    response.then(function(result) {
                        console.log("response.then", invoke, result);
                        invoke.doSend(appId, messageId, {
                            success: result
                        }, foreground);
                    }, function(reason) {
                        console.log("response.then.error", invoke, reason);
                        invoke.doSend(appId, messageId, {
                            error: reason
                        }, foreground);
                    });
                }
                else {
                    console.log("direct return", invoke, response);
                    this.doSend(appId, messageId, {
                        success: response
                    }, foreground);
                }
            }
            catch (e) {
                this.doSend(appId, messageId, {
                    error: e
                }, foreground);
                throw e;
            }
        }

    },

    /**
    *@private
    *
    Handle app to app control messages
        Fetch an RPC proxy
        Call a proxy method
        add or remove an event listener

    control: {
        action: "getProxy|callProxy|addListener|removeListener"
        name: 'Test', Name of either proxy or event
        method: 'foo'   name of proxy method
    }


    */
    handleControlMethod: function(appId,control, messageId, foreground){
        var result;
        var self = this;
        var handlers = {
            getProxy: function(){
                var proxy = self.proxies[control.name];
                if(!proxy){
                    proxy = new Ext.Promise();
                    self.proxies[name] =proxy;
                }
                return proxy;//{methods:["first", "second", "third"]};
            },
            callProxy: function(){
                return {"a" : "b"};
            }
        };

        if(control.action && handlers[control.action]) {
            result = handlers[control.action]();
        } else {
            throw 'Invalid control action';
        }
        return result;

        /*this.doSend(appId, messageId, {
            success:
        }, foreground);*/
    },

    /**
     * @private
     * Broadcast a message (intent) to look for receivers who can respond to the message.
     * @param message
     * @returns {Ext.Promise} A promise that provides an array of objects to fulfill.
     * Each object contains information about a receiver, with 'id', 'name', and 'icon' keys.
     */
    broadcast: function(message) {
        var promise = new Ext.Promise;

        Ext.space.Communicator.send({
            command: 'Invoke#connect',
            callbacks: {
                success: function(result) {
                    if (!result || result.length === 0) {
                        promise.reject({
                            code: 1,
                            message: "There are no receivers for this connection"
                        });
                        return;
                    }

                    promise.fulfill(result);
                },
                failure: function(reason) {
                    promise.reject(reason);
                }
            },
            message: message
        });

        return promise;
    },

    /**
     * @private
     * @param receiverId
     * @param messageId
     * @param message
     * @param foreground
     * @returns {Ext.Promise}
     */
    doSend: function(receiverId, messageId, message, foreground) {
        var promise = new Ext.Promise,
            appId = Ext.space.Communicator.appId;

        var success = function(result) {
            promise.fulfill(result);
        };

        success.args = arguments;

        Ext.space.Communicator.send({
            command: 'Invoke#send',
            callbacks: {
                success: success,
                failure: function(reason) {
                    promise.reject(reason);
                }
            },
            receiverId: receiverId,
            foreground: foreground,
            message: {
                id: messageId,
                appId: appId,
                message: message,
                foreground: foreground
            }
        });

        return promise;
    }
});

/**
 * @private
 * The SqlResultSetRowList class which is used to represent rows returned by Sql statements.
 */
Ext.define('Ext.space.sqlite.SqlResultSetRowList', {
    names: null,
    rows: null,

    constructor: function(data) {
        this.names = data.names;
        this.rows = data.rows;
    },

    /**
     * Returns the number of rows returned by the Sql statement.
     *
     * @return {Number}
     * The number of rows.
     */
    getLength: function() {
        return this.rows.length;
    },

    /**
     * Returns a row at specified index returned by the Sql statement.
     * If there is no such row, returns null.
     *
     * @param {Number} index
     * The index of a row. This is required.
     *
     * @return {Object}
     * The row.
     */
    item: function(index) {
        if (index < this.getLength()) {
            var item = {};
            var row = this.rows[index];
            this.names.forEach(function(name, index) {
                item[name] = row[index];
            });

            return item;
        }

        return null;
    }
});

/**
 * @private
 * The SqlResultSet class which is used to represent Sql statements results.
 */
Ext.define('Ext.space.sqlite.SqlResultSet', {
    insertId: 0,
    rowsAffected: 0,
    rows: null,

    constructor: function(data) {
        this.insertId = data.insertId;
        this.rowsAffected = data.rowsAffected;
        this.rows = new Ext.space.sqlite.SqlResultSetRowList(data);
    },

    /**
     * Returns the row ID of the last row that the Sql statement inserted into the database, if the statement inserted any rows.
     * If the statement did not insert a row, throws an exception.
     *
     * @return {Number}
     * The inserted row ID.
     */
    getInsertId: function() {
        if (this.insertId !== 0) {
            return this.insertId;
        } else {
            throw new Error('Ext.space.sqlite.SqlResultSet#getInsertId: An SqlTransaction did not insert a row.');
        }
    },

    /**
     * Returns the number of rows that were changed by the Sql statement.
     * If the statement did not change any rows, returns zero.
     *
     * @return {Number}
     * The number of rows affected.
     */
    getRowsAffected: function() {
        return this.rowsAffected;
    },

    /**
     * Returns a {@link Ext.space.sqlite.SqlResultSetRowList} instance representing rows returned by the Sql statement.
     *
     * @return {Ext.space.sqlite.SqlResultSetRowList}
     * The rows.
     */
    getRows: function() {
        return this.rows;
    }
});

/**
 *
 * @private
 * The SqlTransaction class which is used to execute Sql statements.
 */
Ext.define('Ext.space.sqlite.SqlTransaction', {
    id: 0,
    database: null,
    valid: true,
    statements: null,
    promise: null,

    constructor: function(id, database) {
        this.id = id;
        this.database = database;
        this.statements = [];
        this.promise = new Ext.Promise();
    },

    /**
     * Executes a Sql statement.
     *
     * @param {String} sql
     * The Sql statement to execute. This is required.
     *
     * @param {Array} args
     * The arguments array to bind each '?' placeholder in the Sql statement. This is optional.
     *
     * @return {Ext.Promise}
     * The promise that is resolved when the Sql statement has finished executing.
     */
    executeSql: function(sql, args) {
        if (!this.valid) {
            throw new Error('Ext.space.sqlite.SqlTransaction#executeSql: An attempt was made to use a SqlTransaction that is no longer usable.');
        }

        if (sql == null) {
            throw new Error('Ext.space.sqlite.SqlTransaction#executeSql: You must specify `sql` for the transaction.');
        }

        var promise = new Ext.Promise();

        this.statements.push({
            sql: sql,
            args: args,
            promise: promise
        });

        return promise;
    },

    begin: function() {
        var me = this,
            promise = new Ext.Promise(),
            error;

        if (me.valid) {
            me.valid = false;
            error = Ext.space.Communicator.send({
                command: 'Sqlite#beginTransaction',
                transactionId: me.id,
                callbacks: {
                    success: function() {
                        promise.fulfill();
                    },
                    failure: function(e) {
                        promise.reject(e);
                        me.rollback(e);
                    }
                }
            }, true);

            if (error) {
                promise.reject(error);
                me.rollback(error);
            } else if (error === '') {
                promise.fulfill();
            }
        } else {
            promise.reject('Ext.space.sqlite.SqlTransaction#begin: Transaction has already been started');
        }

        return promise;
    },

    execute: function() {
        var me = this;

        function next(stmt) {
            if (!stmt) {
                me.commit();
                return;
            }

            var result = Ext.space.Communicator.send({
                command: 'Sqlite#executeStatement',
                transactionId: me.id,
                databaseId: me.database.id,
                version: me.database.version,
                sqlStatement: stmt.sql,
                arguments: JSON.stringify(stmt.args),
                callbacks: {
                    success: function(rs) {
                        // Protect against a DB deadlock in case promise handler throws an exception.
                        try {
                            stmt.promise.fulfill(new Ext.space.sqlite.SqlResultSet(rs));
                            next(me.statements.shift());
                        } catch(e) {
                            stmt.promise.reject(e);
                            me.rollback(e);
                        }
                    },
                    failure: function(e) {
                        // Protect against a DB deadlock in case promise handler throws an exception.
                        try {
                            stmt.promise.reject(result.error);
                        } catch(ex) {}
                        me.rollback(e);
                    }
                }
            }, true);

            if (result) {
                if (result.error) {
                    // Protect against a DB deadlock in case promise handler throws an exception.
                    try {
                        stmt.promise.reject(result.error);
                    } catch(e) {}
                    me.rollback(result.error);
                } else {
                    // Protect against a DB deadlock in case promise handler throws an exception.
                    try {
                        stmt.promise.fulfill(new Ext.space.sqlite.SqlResultSet(result));
                        next(me.statements.shift());
                    } catch(e) {
                        stmt.promise.reject(e);
                        me.rollback(e);
                    }
                }
            }
        }

        next(me.statements.shift());
    },

    commit: function() {
        var me = this,
            error = Ext.space.Communicator.send({
                command: 'Sqlite#commitTransaction',
                transactionId: me.id,
                callbacks: {
                    success: function() {
                        me.promise.fulfill();
                    },
                    failure: me.rollback
                },
                scope: me
            }, true);

        if (error) {
            me.rollback(error);
        } else if (error === '') {
            me.promise.fulfill();
        }
    },

    rollback: function(e) {
        Ext.space.Communicator.send({
            command: 'Sqlite#rollbackTransaction',
            transactionId: this.id
        }, true);

        this.promise.reject(e);
    },

    /**
     * Batch executes all queued Sql statements inside a transaction, handling errors and commit/rollback automatically.
     *
     * @return {Ext.Promise}
     * The promise that is resolved when the transaction has been committed or rolled back.
     */
    run: function() {
        this.begin().then(this.execute.bind(this));
        return this.promise;
    }
});

/**
 * @private
 *
 * The Database class which is used to perform transactions.
 */
Ext.define('Ext.space.sqlite.Database', {
    id: 0,
    version: null,

    constructor: function(id, version) {
        this.id = id;
        this.version = version;
    },

    /**
     * Returns the current version of the database.
     *
     * @return {Ext.Promise}
     * The promise that will resolve when the version is returned.
     */
    getVersion: function() {
        var me = this,
            result = new Ext.Promise(),
            version = Ext.space.Communicator.send({
                command: 'Sqlite#getVersion',
                databaseId: this.id,
                callbacks: {
                    success: function(vesion) {
                        me.version = version;
                        result.fulfill(version);
                    },
                    failure: function(e) {
                        result.reject(e);
                    }
                }
            }, true);

        // A version could technically be an empty string, and that's valid.
        if (version || version === '') {
            me.version = version;
            result.fulfill(version);
        }

        return result;
    },

    /**
     * Performs a {@link Ext.space.sqlite.SqlTransaction} instance with a read/write mode.
     *
     * @return {Ext.Promise}
     * The promise that is resolved when the transaction has successfully been created.
     */
    transaction: function(config) {
        config = config || {};
        var promise = new Ext.Promise(),
            me = this;

        Ext.space.Communicator.send({
            command: 'Sqlite#createTransaction',
            databaseId: this.id,
            readOnly: config.readOnly,
            callbacks: {
                success: function(id) {
                    promise.fulfill(new Ext.space.sqlite.SqlTransaction(id, me));
                },
                failure: function(e) {
                    promise.reject(e);
                }
            }
        });

        return promise;
    },

    /**
     * Works same as {@link Ext.space.sqlite.Database#transaction}, but performs a {@link Ext.space.sqlite.SqlTransaction} instance in read-only mode.
     */
    readTransaction: function(config) {
        return this.transaction(Ext.apply(config || {}, {
            readOnly: true
        }));
    },

    /**
     * Verifies and changes the version of the database at the same time as doing a schema update with a {@link Ext.space.sqlite.SqlTransaction} instance.
     *
     * @param {String} version
     * The new version of the database. This is required.
     *
     * @return {Ext.Promise}
     * The promise that is resolved when the database version has been changed, passing in the {Ext.space.sqlite.SqlTransaction} instance
     * that is bound to the version change operation.
     */
    changeVersion: function(version) {
        var me = this;

        if (version == null) {
            throw new Error('Ext.space.sqlite.Database#changeVersion: You must specify a `version` for the database.');
        }

        var promise = new Ext.Promise(),
            reject = function(e) {
                promise.reject(e);
            };

        me.getVersion().then(function(v) {
            if (v != me.version) {
                reject('Ext.space.sqlite.Database#changeVersion: Unable to change version due to a version mismatch');
                return;
            }

            return me.transaction().then(function(t) {
                return t.begin().then(function() {
                    var result = Ext.space.Communicator.send({
                        command: 'Sqlite#setVersion',
                        databaseId: me.id,
                        version: version,
                        callbacks: {
                            success: function() {
                                me.version = version;
                                promise.fulfill(t);
                            },
                            failure: reject
                        }
                    }, true);

                    if (result) {
                        me.version = version;
                        promise.fulfill(t);
                    } else if (result === '') {
                        reject('Ext.space.sqlite.Database#changeVersion: Unable to change version');
                    }
                });
            });
        }).error(reject);

        return promise;
    },


    dropDatabase: function(){
        var promise = new Ext.Promise();
         Ext.space.Communicator.send({
            command: 'Sqlite#dropDatabase',
            databaseId: this.id,
            callbacks: {
                success: function(results) {
                    promise.fulfill(results);
                },
                failure: function(e) {
                    promise.reject(e);
                }
            }
        });
        return promise;
    }
});


/**
* @private
*
*/
Ext.define('Ext.space.Sqlite', {
    singleton: true,

    /**
     * Opens an instance of {@link Ext.space.sqlite.Database}. If the database with specified name does not exist, it will be created.
     *
     * @param {Object} config
     * The object which contains the following config options:
     *
     * @param {String} config.name
     * The name of the database to open. This is required.
     *
     * @param {String} config.version
     * The version of the database to open. This is required.
     *
     * @param {String} config.displayName
     * The display name of the database to open. This is required.
     *
     * @param {Number} config.estimatedSize
     * The estimated size of the database to open. This is required.
     *
     * @return {Ext.Promise}
     * The promise that will resolve when the {@link Ext.space.sqlite.Database} is opened and returned.
     */
    openDatabase: function(config) {
        if (config.name == null) {
            throw new Error('Ext.space.Sqlite#openDatabase: You must specify a `name` of the database.');
        }

        if (config.version == null) {
            throw new Error('Ext.space.Sqlite#openDatabase: You must specify a `version` of the database.');
        }

        if (config.displayName == null) {
            throw new Error('Ext.space.Sqlite#openDatabase: You must specify a `displayName` of the database.');
        }

        if (config.estimatedSize == null) {
            throw new Error('Ext.space.Sqlite#openDatabase: You must specify a `estimatedSize` of the database.');
        }

        var promise = new Ext.Promise(),
            createDatabase = function(db) {
                return new Ext.space.sqlite.Database(db.id, db.version);
            };

        var result = Ext.space.Communicator.send({
            command: 'Sqlite#openDatabase',
            name: config.name,
            version: config.version,
            displayName: config.displayName,
            estimatedSize: config.estimatedSize,
            callbacks: {
                success: function(db) {
                    promise.fulfill(createDatabase(db));
                },
                failure: function(e) {
                    promise.reject(e);
                }
            }
        }, true);

        if (result) {
            if (result.error) {
                promise.reject(result.error);
            } else {
                promise.fulfill(createDatabase(result));
            }
        }

        return promise;
    }
});

/**
 * @private
 * The Entry class which is used to represent entries in a file system,
 * each of which may be a {@link Ext.space.filesystem.FileEntry} or a {@link Ext.space.filesystem.DirectoryEntry}.
 *
 * This is an abstract class.
 * @abstract
 */
Ext.define('Ext.space.filesystem.Entry', {
    directory: false,
    path: 0,
    fileSystem: null,

    constructor: function(directory, path, fileSystem) {
        this.directory = directory;
        this.path = path;
        this.fileSystem = fileSystem;
    },

    /**
     * Returns whether the entry is a file.
     *
     * @return {Boolean}
     * The entry is a file.
     */
    isFile: function() {
        return !this.directory;
    },

    /**
     * Returns whether the entry is a directory.
     *
     * @return {Boolean}
     * The entry is a directory.
     */
    isDirectory: function() {
        return this.directory;
    },

    /**
     * Returns the name of the entry, excluding the path leading to it.
     *
     * @return {String}
     * The entry name.
     */
    getName: function() {
        var components = this.path.split('/');
        for (var i = components.length - 1; i >= 0; --i) {
            if (components[i].length > 0) {
                return components[i];
            }
        }

        return '/';
    },

    /**
     * Returns the full absolute path from the root to the entry.
     *
     * @return {String}
     * The entry full path.
     */
    getFullPath: function() {
        return this.path;
    },

    /**
     * Returns the file system on which the entry resides.
     *
     * @return {Ext.space.filesystem.FileSystem}
     * The entry file system.
     */
    getFileSystem: function() {
        return this.fileSystem;
    },

    /**
     * Moves the entry to a different location on the file system.
     *
     * @param {Object} config
     * The object which contains the following config options:
     *
     * @param {Ext.space.filesystem.DirectoryEntry} config.parent This is required.
     * The directory to which to move the entry.
     *
     * @param {String} config.newName This is optional.
     * The new name of the entry to move. Defaults to the entry's current name if unspecified.
     *
     * @param {Function} config.success This is optional.
     * The callback to be called when the entry has been successfully moved.
     *
     * @param {Ext.space.filesystem.Entry} config.success.entry
     * The entry for the new location.
     *
     * @param {Function} config.failure This is optional.
     * The callback to be called when an error occurred.
     *
     * @param {Object} config.failure.error
     * The occurred error.
     *
     * @param {Object} config.scope
     * The scope object
     */
    moveTo: function(config) {
        if (config.parent == null) {
            throw new Error('Ext.space.filesystem.Entry#moveTo: You must specify a new `parent` of the entry.');
            return null;
        }

        var me = this;
        Ext.space.Communicator.send({
            command: 'FileSystem#moveTo',
            path: this.path,
            fileSystemId: this.fileSystem.id,
            parentPath: config.parent.path,
            newName: config.newName,
            copy: config.copy,
            callbacks: {
                success: function(path) {
                    if (config.success) {
                        var entry = me.directory
                            ? new Ext.space.filesystem.DirectoryEntry(path, me.fileSystem)
                            : new Ext.space.filesystem.FileEntry(path, me.fileSystem);

                        config.success.call(config.scope || this, entry);
                    }
                },
                failure: function(error) {
                    if (config.failure) {
                        config.failure.call(config.scope || this, error);
                    }
                }
            },
            scope: config.scope || this
        });
    },

    /**
     * Works the same way as {@link Ext.space.filesystem.Entry#moveTo}, but copies the entry.
     */
    copyTo: function(config) {
        this.moveTo(Ext.apply(config, {
            copy: true
        }));
    },

    /**
     * Removes the entry from the file system.
     *
     * @param {Object} config
     * The object which contains the following config options:
     *
     * @param {Function} config.success This is optional.
     * The callback to be called when the entry has been successfully removed.
     *
     * @param {Function} config.failure This is optional.
     * The callback to be called when an error occurred.
     *
     * @param {Object} config.failure.error
     * The occurred error.
     *
     * @param {Object} config.scope
     * The scope object
     */
    remove: function(config) {
        Ext.space.Communicator.send({
            command: 'FileSystem#remove',
            path: this.path,
            fileSystemId: this.fileSystem.id,
            recursively: config.recursively,
            callbacks: {
                success: function() {
                    if (config.success) {
                        config.success.call(config.scope || this);
                    }
                },
                failure: function(error) {
                    if (config.failure) {
                        config.failure.call(config.scope || this, error);
                    }
                }
            },
            scope: config.scope || this
        });
    },

    /**
     * Looks up the parent directory containing the entry.
     *
     * @param {Object} config
     * The object which contains the following config options:
     *
     * @param {Function} config.success This is required.
     * The callback to be called when the parent directory has been successfully selected.
     *
     * @param {Ext.space.filesystem.DirectoryEntry} config.success.entry
     * The parent directory of the entry.
     *
     * @param {Function} config.failure This is optional.
     * The callback to be called when an error occurred.
     *
     * @param {Object} config.failure.error
     * The occurred error.
     *
     * @param {Object} config.scope
     * The scope object
     */
    getParent: function(config) {
        if (!config.success) {
            throw new Error('Ext.space.filesystem.Entry#getParent: You must specify a `success` callback.');
            return null;
        }

        var me = this;
        Ext.space.Communicator.send({
            command: 'FileSystem#getParent',
            path: this.path,
            fileSystemId: this.fileSystem.id,
            callbacks: {
                success: function(path) {
                    var entry = me.directory
                        ? new Ext.space.filesystem.DirectoryEntry(path, me.fileSystem)
                        : new Ext.space.filesystem.FileEntry(path, me.fileSystem);

                    config.success.call(config.scope || this, entry);
                },
                failure: function(error) {
                    if (config.failure) {
                        config.failure.call(config.scope || this, error);
                    }
                }
            },
            scope: config.scope || this
        });
    }
});

/**
 * @private
 * The DirectoryEntry class which is used to represent a directory on a file system.
 */
Ext.define('Ext.space.filesystem.DirectoryEntry', {
    extend: Ext.space.filesystem.Entry,

    constructor: function(path, fileSystem) {
        Ext.space.filesystem.DirectoryEntry.superclass.constructor.apply(this, [true, path, fileSystem]);
    },

    /**
     * Lists all the entries in the directory.
     *
     * @param {Object} config
     * The object which contains the following config options:
     *
     * @param {Function} config.success This is required.
     * The callback to be called when the entries has been successfully read.
     *
     * @param {Ext.space.filesystem.Entry[]} config.success.entries
     * The array of entries of the directory.
     *
     * @param {Function} config.failure This is optional.
     * The callback to be called when an error occurred.
     *
     * @param {Object} config.failure.error
     * The occurred error.
     *
     * @param {Object} config.scope
     * The scope object
     */
    readEntries: function(config) {
        if (!config.success) {
            throw new Error('Ext.space.filesystem.DirectoryEntry#readEntries: You must specify a `success` callback.');
            return null;
        }

        var me = this;
        Ext.space.Communicator.send({
            command: 'FileSystem#readEntries',
            path: this.path,
            fileSystemId: this.fileSystem.id,
            callbacks: {
                success: function(entryInfos) {
                    var entries = entryInfos.map(function(entryInfo) {
                        return entryInfo.directory
                            ? new Ext.space.filesystem.DirectoryEntry(entryInfo.path, me.fileSystem)
                            : new Ext.space.filesystem.FileEntry(entryInfo.path, me.fileSystem);
                    });

                    config.success.call(config.scope || this, entries);
                },
                failure: function(error) {
                    if (config.failure) {
                        config.failure.call(config.scope || this, error);
                    }
                }
            },
            scope: config.scope || this
        });
    },

    /**
     * Creates or looks up a file.
     *
     * @param {Object} config
     * The object which contains the following config options:
     *
     * @param {String} config.path This is required.
     * The absolute path or relative path from the entry to the file to create or select.
     *
     * @param {Object} config.options This is optional.
     * The object which contains the following options:
     *
     * @param {Boolean} config.options.create This is optional.
     * Indicates whether to create a file, if path does not exist.
     *
     * @param {Boolean} config.options.exclusive This is optional. Used with 'create', by itself has no effect.
     * Indicates that method should fail, if path already exists.
     *
     * @param {Function} config.success This is optional.
     * The callback to be called when the file has been successfully created or selected.
     *
     * @param {Ext.space.filesystem.Entry} config.success.entry
     * The created or selected file.
     *
     * @param {Function} config.failure This is optional.
     * The callback to be called when an error occurred.
     *
     * @param {Object} config.failure.error
     * The occurred error.
     *
     * @param {Object} config.scope
     * The scope object
     */
    getFile: function(config) {
        if (config.path == null) {
            throw new Error('Ext.space.filesystem.DirectoryEntry#getFile: You must specify a `path` of the file.');
            return null;
        }

        if (config.options == null) {
            config.options = {};
        }

        var me = this;
        Ext.space.Communicator.send({
            command: 'FileSystem#getEntry',
            path: this.path,
            fileSystemId: this.fileSystem.id,
            newPath: config.path,
            directory: config.directory,
            create: config.options.create,
            exclusive: config.options.exclusive,
            callbacks: {
                success: function(path) {
                    if (config.success) {
                        var entry = config.directory
                            ? new Ext.space.filesystem.DirectoryEntry(path, me.fileSystem)
                            : new Ext.space.filesystem.FileEntry(path, me.fileSystem);

                        config.success.call(config.scope || this, entry);
                    }
                },
                failure: function(error) {
                    if (config.failure) {
                        config.failure.call(config.scope || this, error);
                    }
                }
            },
            scope: config.scope || this
        });
    },

    /**
     * Works the same way as {@link Ext.space.filesystem.DirectoryEntry#getFile},
     * but creates or looks up a directory.
     */
    getDirectory: function(config) {
        this.getFile(Ext.apply(config, {
            directory: true
        }));
    },

    /**
     * Works the same way as {@link Ext.space.filesystem.Entry#remove},
     * but removes the directory and all of its contents, if any.
     */
    removeRecursively: function(config) {
        this.remove(Ext.apply(config, {
            recursively: true
        }));
    }
});

/**
 * @private
 * The FileEntry class which is used to represent a file on a file system.
 */
Ext.define('Ext.space.filesystem.FileEntry', {
    extend: Ext.space.filesystem.Entry,

    offset: 0,

    constructor: function(path, fileSystem) {
        Ext.space.filesystem.FileEntry.superclass.constructor.apply(this, [false, path, fileSystem]);

        this.offset = 0;
    },

    /**
     * Returns the byte offset into the file at which the next read/write will occur.
     *
     * @return {Number}
     * The file offset.
     */
    getOffset: function() {
        return this.offset;
    },

    /**
     * Sets the byte offset into the file at which the next read/write will occur.
     *
     * @param {Object} config
     * The object which contains the following config options:
     *
     * @param {Number} config.offset This is required.
     * The file offset to set. If negative, the offset back from the end of the file.
     *
     * @param {Function} config.success This is optional.
     * The callback to be called when the file offset has been successfully set.
     *
     * @param {Function} config.failure This is optional.
     * The callback to be called when an error occurred.
     *
     * @param {Object} config.failure.error
     * The occurred error.
     *
     * @param {Object} config.scope
     * The scope object
     */
    seek: function(config) {
        if (config.offset == null) {
            throw new Error('Ext.space.filesystem.FileEntry#seek: You must specify an `offset` in the file.');
            return null;
        }

        var me = this;
        Ext.space.Communicator.send({
            command: 'FileSystem#seek',
            path: this.path,
            fileSystemId: this.fileSystem.id,
            offset: config.offset,
            callbacks: {
                success: function(offset) {
                    me.offset = offset;

                    if (config.success) {
                        config.success.call(config.scope || this);
                    }
                },
                failure: function(error) {
                    if (config.failure) {
                        config.failure.call(config.scope || this, error);
                    }
                }
            },
            scope: config.scope || this
        });
    },

    /**
     * Reads the data from the file starting at the file offset.
     *
     * @param {Object} config
     * The object which contains the following config options:
     *
     * @param {Number} config.length This is optional.
     * The length of bytes to read from the file. Defaults to the file's current size if unspecified.
     *
     * @param {Function} config.success This is optional.
     * The callback to be called when the data has been successfully read.
     *
     * @param {Object} config.success.data
     * The read data.
     *
     * @param {Function} config.failure This is optional.
     * The callback to be called when an error occurred.
     *
     * @param {Object} config.failure.error
     * The occurred error.
     *
     * @param {Object} config.scope
     * The scope object
     */
    read: function(config) {
        var me = this;
        Ext.space.Communicator.send({
            command: 'FileSystem#read',
            path: this.path,
            fileSystemId: this.fileSystem.id,
            offset: this.offset,
            length: config.length,
            callbacks: {
                success: function(result) {
                    me.offset = result.offset;

                    if (config.success) {
                        config.success.call(config.scope || this, result.data);
                    }
                },
                failure: function(error) {
                    if (config.failure) {
                        config.failure.call(config.scope || this, error);
                    }
                }
            },
            scope: config.scope || this
        });
    },

    /**
     * Writes the data to the file starting at the file offset.
     *
     * @param {Object} config
     * The object which contains the following config options:
     *
     * @param {Object} config.data This is required.
     * The data to write to the file.
     *
     * @param {Function} config.success This is optional.
     * The callback to be called when the data has been successfully written.
     *
     * @param {Function} config.failure This is optional.
     * The callback to be called when an error occurred.
     *
     * @param {Object} config.failure.error
     * The occurred error.
     *
     * @param {Object} config.scope
     * The scope object
     */
    write: function(config) {
        if (config.data == null) {
            throw new Error('Ext.space.filesystem.FileEntry#write: You must specify a `data` for the file.');
            return null;
        }

        var me = this;
        Ext.space.Communicator.send({
            command: 'FileSystem#write',
            path: this.path,
            fileSystemId: this.fileSystem.id,
            offset: this.offset,
            data: config.data,
            callbacks: {
                success: function(offset) {
                    me.offset = offset;

                    if (config.success) {
                        config.success.call(config.scope || this);
                    }
                },
                failure: function(error) {
                    if (config.failure) {
                        config.failure.call(config.scope || this, error);
                    }
                }
            },
            scope: config.scope || this
        });
    },

    /**
     * Truncates or extends the file to the specified size in bytes.
     * If the file is extended, the added bytes are null bytes.
     *
     * @param {Object} config
     * The object which contains the following config options:
     *
     * @param {Number} config.size This is required.
     * The new file size.
     *
     * @param {Function} config.success This is optional.
     * The callback to be called when the file size has been successfully changed.
     *
     * @param {Function} config.failure This is optional.
     * The callback to be called when an error occurred.
     *
     * @param {Object} config.failure.error
     * The occurred error.
     *
     * @param {Object} config.scope
     * The scope object
     */
    truncate: function(config) {
        if (config.size == null) {
            throw new Error('Ext.space.filesystem.FileEntry#truncate: You must specify a `size` of the file.');
            return null;
        }

        var me = this;
        Ext.space.Communicator.send({
            command: 'FileSystem#truncate',
            path: this.path,
            fileSystemId: this.fileSystem.id,
            offset: this.offset,
            size: config.size,
            callbacks: {
                success: function(offset) {
                    me.offset = offset;

                    if (config.success) {
                        config.success.call(config.scope || this);
                    }
                },
                failure: function(error) {
                    if (config.failure) {
                        config.failure.call(config.scope || this, error);
                    }
                }
            },
            scope: config.scope || this
        });
    }
});

/**
* @private
*/
Ext.define('Ext.space.filesystem.FileSystem', {
    id: 0,
    root: null,

    constructor: function(id) {
        this.id = id;
        this.root = new Ext.space.filesystem.DirectoryEntry('/', this);
    },

    /**
     * Returns a {@link Ext.space.filesystem.DirectoryEntry} instance for the root of the file system.
     *
     * @return {Ext.space.filesystem.DirectoryEntry}
     * The file system root directory.
     */
    getRoot: function() {
        return this.root;
    }
});

/**
* @private
*/
Ext.define('Ext.space.FileSystem', {
    singleton: true,

    /**
     * Requests a {@link Ext.space.filesystem.FileSystem} instance.
     *
     * @param {Object} config
     * The object which contains the following config options:
     *
     * @param {Function} config.type This is optional.
     * The type of a file system to request. Specify "LOCKER" to request the File Locker.
     *
     * @param {Function} config.success This is required.
     * The callback to be called when the file system has been successfully created.
     *
     * @param {Ext.space.filesystem.FileSystem} config.success.fileSystem
     * The created file system.
     *
     * @param {Function} config.failure This is optional.
     * The callback to be called when an error occurred.
     *
     * @param {Object} config.failure.error
     * The occurred error.
     *
     * @param {Object} config.scope
     * The scope object
     */
    requestFileSystem: function(config) {
        if (!config.success) {
            throw new Error('Ext.space.filesystem#requestFileSystem: You must specify a `success` callback.');
            return null;
        }

        Ext.space.Communicator.send({
            command: 'FileSystem#requestFileSystem',
            callbacks: {
                type: config.type,
                success: function(id) {
                    var fileSystem = new Ext.space.filesystem.FileSystem(id);

                    config.success.call(config.scope || this, fileSystem);
                },
                failure: function(error) {
                    if (config.failure) {
                        config.failure.call(config.scope || this, error);
                    }
                }
            },
            scope: config.scope || this
        });
    }
});

/**
*  A Key/Value store where the data is persisted to an encrypted store inside of Sencha Space instead of plain text.
  This class should not be created directly but instead should be obtained via Ext.space.SecureLocalStorage
*
*/
Ext.define('Ext.space.localstorage.Collection', {
    /*
    * @private
    */
    constructor: function(name, loaded) {
        //add code to normalize name to sql table name limits
        this.name = name;
        this.loaded = loaded;

    },

    /**
    * @private
    */
    query: function(query, params) {
        var rs = new Ext.Promise();

        this.loaded.then(function(db) {
            return db.transaction().then(function(transaction) {
                transaction.executeSql(query, params).then(function(results) {
                    rs.fulfill(results);
                });

                return transaction.run();
            });
        }).error(function(e) {
            rs.reject(e);
        });

        return rs;
    },



    /**
    * Get the value for a key

        var secrets = Ext.space.SecureLocalStore.get('secrets');

        secrets.get('myKey').then(function(object){
            var a = object.field;
        });

    * @param {String} key  The key to get a value for.
    * @return {Ext.Promise} the promise that will resolve when the value is fetched.
    *
    */
    get: function(key){
       var result = new Ext.Promise();
        this.query("select value from item where collection = ? and name = ?", [this.name, key]).then(function(rs){
            console.log("value ", rs.rows.rows.length);
            if(rs.rows.rows.length > 0){
                result.fulfill(JSON.parse(rs.rows.rows[0][0]));
            } else {
                result.fulfill(undefined);
            }
        });
        return result;
    },



    /**
    * Get the value for a key

        var secrets = Ext.space.SecureLocalStore.get('secrets');

        secrets.set('myKey',object).then(function(){
            //do something when done.
        });



    * @param {String} key  The key to store the value at.
    * @param {Object} value The JSON object to store.
    * @return {Ext.Promise} the promise that will resolve when the value is stored.
    *
    */
    set: function(key, value){
        var result = new Ext.Promise();

        this.query("INSERT OR REPLACE into item values(?,?,?)", [this.name, key, JSON.stringify(value)]).then(function(rs){
                if(rs.value){
                    result.fulfill(rs.value);
                } else {
                    result.fulfill(undefined);
                }
        });
        return result;
    },

    /**
    * Checks to see if key is present in collection without fetching and de-serializing the value.

        var secrets = Ext.space.SecureLocalStore.get('secrets');

        secrets.has('myKey').then(function(hasKey){

        });

    * @param {String} key  The key to get a value for.
    * @return {Ext.Promise} the promise that will resolve when the value is checked.
    *
    */
    has: function(key){

        var result = new Ext.Promise();

        this.query("select count(*) from item where collection = ? and name = ?", [this.name, key]).then(function(rs){
            console.log("value ",rs.rows.rows.length );
            if(rs.rows.rows[0][0] > 0){
                result.fulfill(true);
            } else {
                result.fulfill(false);
            }
        });

        return result;

    },

    /**
    * Deletes the key if present in collection.

        var secrets = Ext.space.SecureLocalStore.get('secrets');

        secrets.remove('myKey').then(function(done){

        });

    * @param {String} key The key to delete
    * @return {Ext.Promise} the promise that will resolve when the value is checked.
    *
    */
    remove: function(key){
        var result = new Ext.Promise();
        this.query("delete from item where collection = ? and name = ?", [this.name, key]).then(function(rs){
            console.log("value ", rs.rowsAffected);
            if(rs.rowsAffected > 0){
                result.fulfill(true);
            } else {
                result.fulfill(false);
            }
        });
        return result;
    },

    /**
     * Alias for .remove()
     *
     * @private
     * @return {Ext.Promise} the promise that will resolve when the value is checked
     */
    delete: function(key) {
        return this.remove.apply(this, arguments);
    },


    /**
    * Gets an array of all the keys in a collection

        var secrets = Ext.space.SecureLocalStore.get('secrets');

        secrets.keys().then(function(keys){
           console.log(keys.length);
        });

    * @return {Ext.Promise} the promise that will resolve when all of the keys have been collected.
    *
    */
    keys: function() {
        var result = new Ext.Promise();
        this.query("select name from item where collection = ?", [this.name]).then(function(rs){
            var results = [];
            for(var i =0, l = rs.rows.rows.length; i < l; i++ ){
                results.push(rs.rows.rows[i][0]);
            }
            result.fulfill(results);
        });
        return result;
    },

    /**
    * Iterates over all the items in a collection

        var secrets = Ext.space.SecureLocalStore.get('secrets');

         secrets.forEach(function(key, value){}).then(function(){
            // done.
        });


    * @param {Function}  callback this function will be called once for each item in the collection.
    * @return {Ext.Promise} the promise that will resolve when all of the itmes have been iterated.
    *
    */
    forEach: function(callback) {
        var result = new Ext.Promise();
        this.query("select name, value from item where collection = ?", [this.name]).then(function(rs){
            for(var i =0, l = rs.rows.rows.length; i < l; i++ ){
                callback(rs.rows.rows[i][0], JSON.parse(rs.rows.rows[i][1]));
            }
            result.fulfill();
        });
        return result;
    },

    /**
    * Returns a count of the total number of items in the collection

        var secrets = Ext.space.SecureLocalStore.get('secrets');

         secrets.count().then(function(count){
            // done.
        });

    * @return {Ext.Promise} the promise that will resolve with a the number of items in the collection.
    *
    */
    count: function() {
        var result = new Ext.Promise();
        this.query("select count(*) from item where collection = ?", [this.name]).then(function(rs){
            console.log("value ", rs.rows.rows[0][0]);
            result.fulfill(parseInt(rs.rows.rows[0][0]));
        });
        return result;
    },

    /**
    * Deletes all of the items in a collection.

        var secrets = Ext.space.SecureLocalStore.get('secrets');

         secrets.clear().then(function(){
            // done.
        });

    * @return {Ext.Promise} the promise that will resolve with a the number of items in the collection.
    *
    */
    clear: function(){
        return this.query("DELETE FROM item where collection = ?", [this.name]);
    }
});

/**

Secure Local Storage is a key value store modeled around html5 localstoage.

The key differences from localstrorage are:

 - Uses an Asynchronous api based on Ext.Promise
 - Each application can more than one named collection of keys or easier data storage
 - All data is encrypted before being persisted to disk
 - The storage limits for SecureLocalStorage are much higher than the 2-3mb allocated for localstorage.


        var secrets = Ext.space.SecureLocalStorage.get('secrets');

        secrets.set('myKey',object).then(function(){
            //do something when done.
        });

        secrets.get('myKey').then(function(object){
            var a = object.field;
        });

        secrets.remove().then(function(isDeleted){
            // done.
        });

        secrets.has(key).then(function(hasKey){

        });

        secrets.forEach(function(key, value){}).then(function(){
            // done.
        });

        secrets.count().then(function(numberOfItems){

        });

        secrets.clear().then(function(){
            // done.
        });

*/
Ext.define('Ext.space.SecureLocalStorage', {
    singleton: true,

    /*
    * @private
    */
    constructor: function() {
        this.loaded = new Ext.Promise();
    },

    /**
    * Get a collection of name. Collections are automatically created if they do not exist.
    *
    * @param {String} collectionName The name of the collection to get.
    * @return {Ext.space.localstorage.Collection} the secure collection.
    *
    */
    get: function(name) {
        this.load();
        return new Ext.space.localstorage.Collection(name, this.loaded);
    },

    /**
    * @private
    */
    load: function() {
        var me = this,
            loaded = me.loaded;

        if (me.db) {
           return;
        }

        Ext.onSpaceReady().then(function() {
            return Ext.space.Sqlite.openDatabase({
                name: 'sencha_secure_local_store',
                version: '1',
                displayName: 'Secure Local Storage',
                estimatedSize: 5 * 1024 * 1024
            }).then(function(db) {
                me.db = db;

                return db.transaction().then(function(transaction) {
                    transaction.executeSql("CREATE TABLE IF NOT EXISTS item (collection TEXT, name TEXT, value TEXT, PRIMARY KEY (collection, name))");
                    transaction.executeSql("CREATE INDEX IF NOT EXISTS name_idx on item (name)");
                    transaction.executeSql("CREATE INDEX IF NOT EXISTS collection_idx on item (collection)");

                    return transaction.run().then(function() {
                        loaded.fulfill(me.db);
                    });
                });
            });
        }).error(function(e) {
            loaded.reject(e);
        });

        return loaded;
    }
});

/**
* SecureSql Database.
  This class should not be created directly but instead should be obtained via Ext.space.SecureSql.get
*
*/
Ext.define('Ext.space.securesql.Database', {

    /*
    * @private
    */
    constructor: function(name) {
        this.name = name;
        this.versionTable = "_sencha_schema_version";
        this.loadedVersion = -1;
        this.loaded = new Ext.Promise();

        //Don't execute queries until we have loaded/upgraded the schema.
        this.schemaLoaded = new Ext.Promise();
        this.hasLoadedSchema = false;

        var me = this;
        Ext.onSpaceReady().then(function() {
        	console.log("Open database");
        	return Ext.space.Sqlite.openDatabase({
                name: name,
                version: '',// we will do version tracking outside of the sqlite db version system.
                displayName: name,
                estimatedSize: 5 * 1024 * 1024 //we auto extend on the native side, setting the size is vestigial at this point.
            });
        })
        .then(function(db) {
       		//loaded.fulfill(db);
       		console.log("Create database finished.");
       		//Create schema version tracking table;
       		return db.transaction().then(function(transaction) {

       		console.log("Got transaction");
                    transaction.executeSql("CREATE TABLE IF NOT EXISTS " + me.versionTable + " (id int, version int, created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, modified_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  PRIMARY KEY (id))");
                    transaction.executeSql("select version from " + me.versionTable, []).then(function(results) {
                    	console.log("Found db version raw", results);
                    	if(results.rows.rows.length > 0){
			                me.loadedVersion = parseInt(results.rows.rows[0][0]);
			                console.log("me.loadedVersion", me.loadedVersion);
			            }
                	});
                    return transaction.run().then(function() {

       					console.log("setup transaction complete.");
                        me.loaded.fulfill(db);
                    }).error(function(e) {
				            console.log("TX error?", e);
				    });
             });
        })
        .error(function(e) {
            me.loaded.reject(e);
        });
    },

    /**
    *
    */
    createSchema: function(version, callback){

    	version = parseInt(version);

        var promise = new Ext.Promise();


    	var me = this;

	    //TODO should only be called once, need error condition
    	// if called more than once.

    	//create TX, callback, run TX.
    	this.loaded.then(function(db) {

    		console.log("Loaded Version", me.loadedVersion, version);

    		if(me.loadedVersion === version) {
                promise.fulfill();
    			return;
    			//done!
    		} else if(me.loadedVersion >= 0 && me.loadedVersion < version) {
    			//Run migrations!
    			return;
      		}

            var tx = me.createTransaction();

            try{
                callback(tx);
                me._setVersion(tx, version);
                tx.execute().connect(promise);
            }catch(e){
                console.log("Error calling callback" , e);
                promise.reject(e);
                throw e;
            }
            
		});

        return promise; 
    },


    /**
    *
    *
    */
    migration: function(toVersion, callback){

      //If the user has a version that does not match version
      // specified by createSchema then the migrations are run
      // in order until the version number matches.
      // up to the developer to implement correct migrations.
      // TX is passed in, and automatically executed after migration callback function

      // db.migration(version, function(tx){
      //
      //   tx.query();
      //   tx.query();
      //   tx.query();
      //
      // }).then;



    },


    _setVersion: function(transaction, versionNumber){
        var me = this;
    	transaction.query("INSERT OR REPLACE into " + this.versionTable + "(id, version, modified_dt) values(?,?,datetime())",[1,versionNumber]).then(function(){
            me.loadedVersion = versionNumber;
    	});
    },

    /**
    * Execute a query against the database in a single transaction.
    * The promise will return an array of records that match the query.
    * each array value will be an object, the object properties will match field names in the query.
    * if the query uses column aliases then the alias will be returned as the field name.

    testDatabase.query("select id, name from " + TEST_TABLE1 + " where id = ?",[1]).then(function(rows){
        var row = rows[0];
        console.log("record ",row.id, row.name);
    }).error(function(e){
        console.error("Error with query?",e);
    });


    testDatabase.query("select count(*) as countOfTest from test").then(function(rows){
        var row = rows[0];
        console.log("Count of rows in test ", row.countOfTest);
    }).error(function(e){
        console.error("Error with query?",e);
    });
    

    * @param query {String} The SQL statement
    * @param fields {Array} The fields of the statement. 
    * @return {Ext.Promise} promise that will resolve when the query completes 
    *
    * 
    */
    query: function(query, params) {
        var rs = new Ext.Promise();
        console.log("Query", query, params, this.loaded);
        var me = this;

        this.loaded.then(function(db) {

        console.log("Query loaded", query, params);
            return db.transaction().then(function(transaction) {
            	console.log("Query tx start", query);
                transaction.executeSql(query, params).then(function(results) {
                	console.log("Query after query", query, params, results);
                    var insertId = results.insertId;
                	results = me.convertResults(results);
                    rs.fulfill(results, insertId);
                });
                return transaction.run();
            });
        }).error(function(e) {
            rs.reject(e);
        });

        return rs;
    },


    /**
    * convert results from sqllite RS to simple array.
    *@private
    */
    convertResults: function(results){
    	var converted = [];

    	var fields = results.rows.names;
    	var numFields = fields.length;
    	var rows = results.rows.rows;

    	for(var i = 0, l = rows.length; i<l; i++){
    		var row = rows[i];
    		var obj = {};
    		for(var j=0; j < numFields; j++ ){
				obj[fields[j]] = row[j];
    		}
    		converted.push(obj);
    	}
    	return converted;
    },



    /**
    * Insert a single record into a table. Either an array or object can be passed into this function

- If an array then the order of elements in the array must match the order of the fields.
- If an object then the field names will be extracted from the prop

  Array Example:

        testDatabase.insert('test', ["id", "name"], [1, "one"]).then(function(insertId){
            //done with insert
            //insertId will be 1 or the auto increment value of the id of the table if the table has one.
        }).error(function(e){
            console.log("Error with insert",e);
        });

  would be equivalent to

        insert into table test (id, name) values(1,'one');


  Object Example:

        testDatabase.insert('test', ["id", "name"], {id: 2, name:"two"}).then(function(){
            //done with insert
            //insertId will be 2 or the auto increment value of the id of the table if the table has one.
        }).error(function(e){
            console.log("Error with insert",e);
        });

  would be equivalent to

        insert into table test (id, name) values(2,'two');

    * @param table {String} the name of the table the record will be inserted into
    * @param fields {Array} an array of field names to insert.
    * @param values {Array|Object} either an array or object to insert.
    * @return {Ext.Promise} promise that will resolve when the insert is complete.
    *
    */
    insert:function(table, fields, values){
    	var query = this._buildInsertStatement(table, fields, values);
		return this.query(query.statement, query.values).then(function(results, insertId){
            return insertId;
        });
    },

    _buildInsertStatement: function(table, fields, values){
    	var statement = "insert into " + table + "(" + fields.join(",") + ")";
    	var v = [];
    	var vals = [];
    	var isArray = Array.isArray(values);

    	for(var i = 0, l = fields.length; i<l; i++){
    		v.push("?");
    		vals[i] = isArray ? values[i] : values[fields[i]];
    	}
    	statement += " values(" + v.join(",") + ")";
    	return {statement: statement, values: vals};
    },


    /**
    * Insert a multiple records in a single transaction into a table. Either an array of arrays or objects can be passed into this function

- If an array then the order of elements in the array must match the order of the fields.
- If an object then the field names will be extracted from the prop

    * Because this is a transaction either all of inserts will be inserted or no records will be inserted.
    * in the event of a failure the promise will reject with the sql statement that caused the error.


Insert 500 records in a single transaction:

        var records = [];
        for(var i = 1, l = 500; i <= l; i++){
            records.push([i, "row "+ i]);
        }

        testDatabase.insertMany(TEST_TABLE1, ["id", "name"], records).then(function(){
            //Insert complete.
        }).error(function(e){
            console.log("Error with insert",e);
        });

    * @param table {String} the name of the table the record will be inserted into
    * @param fields {Array} an array of field names to insert.
    * @param values {Array} An array of either arrays or objects to insert.
    * @return  {Ext.Promise} promise that will resolve when the insert is complete.

    */
    insertMany:function(table, fields, values){
    	var me = this;
    	var isArray = Array.isArray(values);

        var statements = [];

        for(var i = 0, l = values.length; i<l; i++){
            var row = values[i];
            var q = me._buildInsertStatement(table, fields, row);
            statements.push(q);
        }


    	return this.loaded.then(function(db) {
	    	return db.transaction().then(function(transaction) {
	            	console.log("insert many tx start");

	            	for(var i = 0, l = statements.length; i<l; i++){
	            		var q = statements[i];
	            		transaction.executeSql(q.statement, q.values);
		            }

	                return transaction.run();
	        });
    	});

    },

    /**
    *Creates a new Transaction.
    *Add queries to the transaction then execute them in a single database transaction.

        var tx = testDatabase.createTransaction();
    
        tx.query("select * from test where id = ?",[2]).then(function(rows){
            
        }).error(function(e){
            console.log("Error with query?",e);
        });

        tx.query("select * from test where id = ?",[1]).then(function(rows){
            //
        }).error(function(e){
            console.log("Error with query?",e);
        });


        tx.execute().then(function(){
            //
        }).error(function(e){
            console.log("Error with TX?",e);
        });


    *@return {Ext.space.securesql.Transaction}
    */
    createTransaction:function(){
    	return new Ext.space.securesql.Transaction(this);
    },


 	/**
 	* Permanently delete this database. This operation cannot be undone.
 	* All data in this database will be lost.
   * @return  {Ext.Promise} promise that will resolve when the db has been deleted.
 	*/
    drop: function(){
    	//return this.query("drop table " + this.versionTable);
    	return this.loaded.then(function(db) {
			return db.dropDatabase();
    	});
    },


    /**
    *Import data from the file system into the database. 
    *
    */
    importData: function(fileKey, type, tableName, fields, delimiter, progressCallback, progressCount) {
        var promise = new Ext.Promise();


        this.loaded.then(function(db) {
             Ext.space.Communicator.send({
                command: 'Sqlite#importData',
                databaseId: db.id,
                file: fileKey,
                progressInterval: progressCallback ? (progressCount || 5000) : undefined,
                delimiter: delimiter,
                type: type,
                fields: fields,
                table: tableName,
                callbacks: {
                    onComplete: function(results) {
                        promise.fulfill(results);
                    },
                    onError: function(e) {
                        promise.reject(e);
                    },
                    onProgress: function(imported){
                        console.log("Rows", imported);
                        if(progressCallback && imported.rowsInserted){
                            progressCallback(imported.rowsInserted);
                        }
                    }
                }
            });
        });
        return promise;

    }
});

/**
*
* A SecureSQL database transaction. See Ext.space.securesql.Database.createTransaction
*
*  Queries added to a transaction will be executed as part of a single transaction
*  Each query returns a promise with the data for the query.
*  The execute statement returns a promise that will resolve when the transaction is complete.
*
*
*  If any of the queries generate an error then the transaction will be rolled back and any 
*  data mutations will not be applied to the database.
*
*  The promise of the query that failed will reject. And the promise returned by execute will also reject. 


        var tx = testDatabase.createTransaction();
    
        tx.query("select * from test where id = ?",[2]).then(function(rows){
            
        }).error(function(e){
            console.log("Error with query?",e);
        });

        tx.query("select * from test where id = ?",[1]).then(function(rows){
            //
        }).error(function(e){
            console.log("Error with query?",e);
        });


        tx.execute().then(function(){
            //
        }).error(function(e){
            console.log("Error with TX?",e);
        });




*
*/
Ext.define('Ext.space.securesql.Transaction', {

    /*
    * @private
    */
    constructor: function(database) {
    	this.database = database;
    	this.queries = [];

    },

    /**
    * Add a query this transaction.
    * The promise will return an array of records that match the query.
    * each array value will be an object, the object properties will match field names in the query.
    * if the query uses column aliases then the alias will be returned as the field name.

    testDatabase.query("select id, name from test where id = ?",[1]).then(function(rows){
        var row = rows[0];
        console.log("record ",row.id, row.name);
    }).error(function(e){
        console.error("Error with query?",e);
    });


    testDatabase.query("select count(*) as countOfTest from test").then(function(rows){
        var row = rows[0];
        console.log("Count of rows in test ", row.countOfTest);
    }).error(function(e){
        console.error("Error with query?",e);
    });
    

    * @param query {String} The SQL statement
    * @param fields {Array} The fields of the statement. 
    * @return {Ext.Promise} promise that will resolve when the query completes 
    *
    * 
    */
    query: function(statement, values){
    	var promise = new Ext.Promise();
    	var me = this;
    	this.queries.push({statement: statement, values:values, promise:promise});
    	return promise.then(function(rs){
    		return me.database.convertResults(rs);
    	});
    },



    /**
    * Insert a single record into a table. Either an array or object can be passed into this function

- If an array then the order of elements in the array must match the order of the fields.
- If an object then the field names will be extracted from the prop

  Array Example:

        tx.insert('test', ["id", "name"], [1, "one"]).then(function(insertId){
            //done with insert
            //insertId will be 1 or the auto increment value of the id of the table if the table has one.
        }).error(function(e){
            console.log("Error with insert",e);
        });

  would be equivalent to

        insert into table test (id, name) values(1,'one');


  Object Example:

        tx.insert('test', ["id", "name"], {id: 2, name:"two"}).then(function(){
            //done with insert
            //insertId will be 2 or the auto increment value of the id of the table if the table has one.
        }).error(function(e){
            console.log("Error with insert",e);
        });

  would be equivalent to

        insert into table test (id, name) values(2,'two');

    * @param table {String} the name of the table the record will be inserted into
    * @param fields {Array} an array of field names to insert.
    * @param values {Array|Object} either an array or object to insert.
    * @return  {Ext.Promise} promise that will resolve when the insert is complete.
    *
    */
    insert:function(table, fields, values){
    	var query = this.database._buildInsertStatement(table, fields, values);
    	var promise = new Ext.Promise();
    	var me = this;
    	this.queries.push({statement: query.statement, values:query.values, promise:promise});
    	return promise.then(function(rs){
    		return rs.insertId;
    	});
    },

/**
*  Execute the queries in the transaction. 
*
* @return  {Ext.Promise} will resolve if all the queries or successful or reject if any query fails.
*/
    execute: function(){
    	var queries = this.queries;

        if(this.executePromise){
            return this.executePromise;
        }

    	this.executePromise = this.database.loaded.then(function(db) {
	    	return db.transaction().then(function(transaction) {
	            	for(var i = 0, l = queries.length; i<l; i++){
	            		var query = queries[i];
	            		transaction.executeSql(query.statement, query.values).connect(query.promise);
		            }

	                return transaction.run();
	        });
    	});

        return this.executePromise;

    }


});

/**

SecureSql is the javascript interface to Sencha Space's encrypted SQL database.
SecureSql uses an encrypted form of SQLite 3. Please see http://sqlite.org for more details on the subset of SQL that sqlite supports.


Basic Usage
----

Open a connection to the database. An application can have as many named databases as needed. Each database is independent of the other databases in the application.

    var db = Ext.space.SecureSql.get("test");


Schema
----

Next you will need to define a schema in the database. Each version of the database should have a version number. 
When the database is ready to create tables and indexes, the callback function will be called with a Ext.space.securesql.Transaction.
Add queries to create the tables and indexes needed for this database. 

    	db.createSechema(1, function(tx){
		
			tx.query("CREATE TABLE IF NOT EXISTS test (id int, name text,  PRIMARY KEY (id))");

			tx.query("CREATE TABLE IF NOT EXISTS person (id int, firstName text,lastName text, email text, PRIMARY KEY (id))");

    	});

 Do not run the transaction from within the callback. It will be executed automatically after the callback function returns.

 The callback on createSchema is only called if a database of that version does not already exist.  If the schema of the application's database changes overtime then the data will need to be migrated.  See the Migration section below.

 See Ext.space.securesql.Database.createSchema for more details.

Inserting Data
----

SecureSql provides two convenience methods for inserting data into the database. The application can pass either an array of data or a javascript object.

Ext.space.securesql.Database.insert will insert record into a table using a single transaction.

Ext.space.securesql.Database.insertMany will insert multiple records into a table single transaction.



Queries
----

Ext.space.securesql.Database.query will execute a query against the database in a single transaction.


Transactions
----

SecureSql supports executing multiple inserts and queries in a single logical transaction

		var tx = Ext.space.securesql.Database.createTransaction()

		tx.query()
		tx.insert()
		tx.query()
		tx.query()
		tx.execute()

see Ext.space.securesql.Database.createTransaction


Data Migration
----
SecureSql provides methods to migrate a schema from one version to the next.
Data migrations can become complex so we recommend modification the database as little as possible after the

If the application loads and createSechema attempts to create version 3 of the schema 

		db.createSechema(3, function(tx){
		
			//....

    	});

1) if there this client does not have a database then createSchema executes and the schema version is set to 3
2) if the client already has schema version 3 then nothing happens, and queries will be executed.
3) if the schema version is less that 3 then each of the registered migration callbackes are executed until the version is equal to the version defined in createSechema

It is the responsibility of the developer to ensure that the table mutation operations in the migration callbacks will correctly update the database to the current schema.


IF the developer has defined version 3 of createSechema then they should define two version migrations 


This migration will upgrade version 1 of the database to version 2

		db.migrate(2, function(tx){
			

		});

This migration will upgrade version 2 to version 3:

		db.migrate(3, function(tx){
			

		});

*/

Ext.define('Ext.space.SecureSql', {
    singleton: true,

    /*
    * @private
    */
    constructor: function() {
//        this.loaded = new Ext.Promise();

		this._openDBs = {};
    },


    /**
    *
    * Open a connection to a database. A database will automatically be created if it does not already exist.
    *
    * @param {String} name The name of the database to open.
    * @return {Ext.space.securesql.Database} the secure collection.
    *
    */
    get: function(name){
    	var db = this._openDBs[name];
    	console.log("create database", name, db);
    	if(!db) {
    		db = new Ext.space.securesql.Database(name);
    		this._openDBs[name] = db;
    	}
    	return db;
    },

    /**
    * Permanently delete this database. This operation cannot be undone.
 	 * All data in this database will be lost.
    *
    * @param {String} name The name of the database to delete.
    * @return {Ext.Promise} a promise that will resolve when the database has been removed.
    */
    drop: function(name){
    	var me = this;
    	var done;
    	var db = this._openDBs[name];
    	if(db){
    		done = db.drop();
    	} else {
    		//call drop bridge method
    		done = this.get(name).drop();
    	}
    	return done.then(function(){
    		delete me._openDBs[name];
    	});
    }
});

/**
 * Key/Value store for files. Files stored using this API are encrypted automatically 
 * using Sencha Space's security infrastructure. 
 *
 *      var files = Ext.space.SecureFiles.get('secrets');
 *
 *      files.get('myKey').then(function(contents){
 *          // do something with the content of the file.
 *      });
 *
 * files is an instance of Ext.space.files.Collection. See Ext.space.files.Collection for 
 * a complete list of file operations.
 *
 * This module also allows you to run queries across all of an application's Collections:
 *
 *      Ext.space.SecureFiles.query({ name: "*.txt" }).then(function(files) {
 *          // got 'em
 *      });
 * 
 * @aside guide secure_file_api
 *  
 */
Ext.define("Ext.space.SecureFiles", {
    singleton: true,

    /**
     * @private
     * @type {Object}
     */
    collections: null,

    /**
     * @private
     */
    constructor: function() {
        this.collections = {};
    },

    /**
     * Get a collection by name. Collections are automatically created if they do not
     * exist, and multiple requests for collections with the same name will all
     * return the same collection object.
     *
     * @param {String} name The name of the collection to get.
     * @return {Ext.space.files.Collection} the secure collection.
     */
    get: function(name) {
        if (!this.collections.hasOwnProperty(name)) {
            this.collections[name] = new Ext.space.files.Collection(name);
        }
        return this.collections[name];
    },

    /**
     * Query the application's file system for files that match the given criteria.
     *
     * The `query` is a dictionary with data against which to match files. The fields
     * supported are:
     *
     * * `name`: "exactName.txt", "*.txt", etc...
     * * `type`: MIME type ("text/plain", etc...)
     * * `createdBefore`: Date object
     * * `createdAfter`: Date object
     * * `modifiedBefore`: Date object
     * * `modifiedAfter`: Date object
     *
     * The query will combine the criteria specified and produce an array of matching
     * files. If you omit the query completely, the query operation will return an
     * array of all files in the collection.
     *
     * The `options` is a dictionary describing how you want the results to be presented:
     *
     * * `fetch`: "count" or "data" (the default), to return a simple count, or the
     *   complete results, respectively
     * * `sortField`: name of the field on which to sort
     * * `sortDirection`: "asc" or "desc"
     *
     * @param {Object} query (optional) Query object
     * @param {Object} options (optional) Query options
     * @return {Ext.Promise} Promise that resolves with the Ext.space.files.File
     *                       objects that match the criteria.
     */
    query: function(query, options) {
        var result = new Ext.Promise();
        var qry = {path: "*"}; // default to querying the app's entire file system

        // fetching just a count of results, or the results themselves?
        var fetch = (options && options.fetch && options.fetch.toLowerCase() === "count") ? "count" : "data";

        // dummy collection for holding the files we retrieve, if the data isn't
        // being requested by an existing Collection (denoted in options.collection)
        var dummyCollection = new Ext.space.files.Collection();
        var cacheResult = dummyCollection._cache.bind(dummyCollection);

        if (query) {
            // copy the rest of the query as is
            if (query.name) { qry.name = query.name; }
            if (query.type) { qry.type = query.type; }
            if (query.hasOwnProperty("path")) { qry.path = query.path; }

            // convert Date objects to epoch seconds
            if (query.createdBefore) { qry.createdBefore = query.createdBefore.getTime() / 1000; }
            if (query.createdAfter) { qry.createdAfter = query.createdAfter.getTime() / 1000; }
            if (query.modifiedBefore) { qry.modifiedBefore = query.modifiedBefore.getTime() / 1000; }
            if (query.modifiedAfter) { qry.modifiedAfter = query.modifiedAfter.getTime() / 1000; }
        }

        var args = {
            command: "Files#queryFiles",
            query: qry,
            fetch: fetch,
            callbacks: {
                onSuccess: function(matches) {
                    // if we're fetching a count, return it directly; if we're fetching
                    // data on behalf of a collection, return it directly as well, to
                    // allow the collection to decide how to process it; if we're
                    // querying across all of an application's collections, then put
                    // things in the dummy collection and return what gets stored.
                    if (fetch === "count" || (options && options.collection)) {
                        result.fulfill(matches);
                    } else {
                        result.fulfill(matches.map(function(match) {
                            return cacheResult(match).file;
                        }));
                    }
                },
                onError: function(error) {
                    result.reject(error);
                }
            }
        };

        if (options) {
            if (options.sortField) { args.sortField = options.sortField; }
            if (options.sortDirection) { args.sortDirection = options.sortDirection.toLowerCase(); }
        }

        Ext.space.Communicator.send(args);

        return result;
    }

});

(function(){

// utility function for returning a particular field from the item parameter, or if
// item is a string, the item itself; if neither is valid, return undefined
function extract(item, field) {
    if (item[field]) {
        return item[field];
    } else if (typeof item == "string") {
        return item;
    }
    // intentionally don't return anything
}


// utility function for creating a promise and wiring up callbacks if they were
// provided in the args object (i.e., "callback style invocation").
function promisize(args, options) {
    var promise = new Ext.Promise(),
        supportProgress = !!(options && options.supportProgress);

    if (args && (args.onComplete || args.onError || (supportProgress && args.onProgress))) {
        promise.then(
            typeof args.onComplete == "function" ? args.onComplete : undefined,
            typeof args.onError == "function" ? args.onError : undefined,
            // TODO: create a standard progress handler that invokes both
            //       options.onProgress and args.onProgress (if it exists), and use that
            (supportProgress && typeof args.onProgress == "function") ? args.onProgress : undefined
        );
    }

    return promise;
}


// utility function to filter out the weird empty items that sometimes come back from
// the native side, that look like they're still in progress, but they're invalid;
function downloadIsReal(item) {
    return item.isComplete || (!!item.totalBytes && !!item.fileName);
}


// TODO: Support progress events.
//
// For that, we need our Promise implementation to support them as well, and we'll
// want to store a cache of the promises we create. Then when we get data from
// watchDownloads(), we can send the update in through the cached promises.
//
// If app code wants to listen for updates, that will happen by attaching a progress
// handler to the promise returned by download(), so that means we'll need to
// automatically create a standard progress handler on every download and fire
// progress events on every download we create, whether the app code actually asked
// for them or not (because apps can always add such handlers later, and the Download
// Manager won't have any knowledge of that).
//
/**
 * Promise-based API for downloading files via URL.
 *
 * To download a file:
 *
 *      // list some details when the download completes
 *      function onComplete(download) {
 *          console.log("File finished: " + download.url);
 *          console.log("Size: " + download.totalBytes);
 *          console.log("Saved to: " + download.fileName);
 *      }
 *
 *      Ext.space.Downloads.download({ url: "http://www.sencha.com/" }).then(onComplete);
 *
 * The `download` objects involved here are instances of Ext.space.files.Download.
 *
 * To get a list of all downloads currently in progress, plus up to the ten most
 * recently completed downloads:
 *
 *      Ext.space.Downloads.getDownloads().then(function(downloads) {
 *          downloads.forEach(function(download) {
 *              console.log(download.fileName);
 *          });
 *      });
 *
 * If you have a download object and want to fetch the latest information about it,
 * you can get the progress of a single download at a time:
 *
 *      download.getProgress().then(function(updatedDownload) {
 *          console.log(updatedDownload.bytesDownloaded + " bytes downloaded");
 *      });
 *
 * To cancel a download in progress:
 *
 *      download.cancel().then(function() {
 *          console.log("Canceled!");
 *      });
 *
 * @aside guide file_locker
 *
 */
Ext.define("Ext.space.Downloads", {
    singleton: true,

    /**
     * @private
     * Cache of the download information returned by the native bridge
     */
    downloads: null,

    /**
     * @private
     * Cache of the downloads' Promise objects
     */
    promises: null,

    /**
     * @private
     * Whether or not the download manager has registered callbacks with the native bridge DownloadManager#watchDownloads
     */
    watching: false,

    /**
     * @private
     */
    constructor: function() {
        this.downloads = {};
        this.promises = {};
    },

    /**
     * Download a file.
     *
     * Normal usage is to pass in only the URL, and attach callbacks to the returned
     * Promise via .then(...). If you pass callbacks directly, in the args parameter,
     * they are installed as the respective Promise handlers before returning.
     *
     * @param {String|Object} args URL to download, or property bag with .url,
     *                             .onComplete, .onError, .onProgress
     * @return {Ext.Promise} Promise which will receive an Ext.space.files.Download object
     */
    download: function(args) {
        var url, promise, manager = this;

        if (args) {
            // TODO: wire up the standard progress handler (see the big TODO above)
            promise = promisize(args, {supportProgress: true});
            url = extract(args, "url");

            if (url) {
                Ext.space.Communicator.send({
                    command: "DownloadManager#download",
                    url: url,
                    callbacks: {
                        onStart: function(id) {
                            if (id) {
                                // cache a reference to the Download object, so we can
                                // continue to update it over time
                                manager.downloads[id] = new Ext.space.files.Download();
                                manager.promises[id] = promise;
                            }

                            manager.watchDownloads();
                        },
                        // no onSuccess callback because we'll let watchDownloads do
                        // the necessary notification
                        // onSuccess: function(id) {},
                        onError: function(error) {
                            promise.reject(error);
                        }
                    }
                });

            }
        }

        if (!args || !url) {
            promise.reject("Missing URL");
        }

        return promise;
    },

    /**
     * Retrieve the current status of all active downloads, plus up to 10 of the most
     * recently completed downloads.
     *
     * @param {Object} args (optional) Object with .onComplete and/or .onError
     *                      callback(s) to run when the download finishes
     * @return {Ext.Promise} Promise which will receive an array of
     *                       Ext.space.files.Download objects
     */
    getDownloads: function(args) {
        var promise = promisize(args, {supportProgress: false});

        var manager = this;

        function makeDownload(item) {
            var id = item.downloadId;
            if (manager.downloads[id]) {
                return manager.downloads[id]._updateWith(item);
            } else {
                manager.downloads[id] = new Ext.space.files.Download(item);
                return manager.downloads[id];
            }
        }

        Ext.space.Communicator.send({
            command: "DownloadManager#getDownloads",
            callbacks: {
                onSuccess: function(responses) {
                    if (Object.prototype.toString.call(responses) === "[object Array]") {
                        // resolve with an array of Download objects
                        promise.fulfill(responses.filter(downloadIsReal).map(makeDownload));
                        manager.watchDownloads();

                    } else {
                        // what happened?
                        promise.reject("Malformed (non-Array) response from the native bridge");
                    }
                },
                onError: function(error) {
                    promise.reject(error);
                }
            }
        });

        return promise;
    },

    /**
     * Check a download's progress (normally done via download.getProgress()).
     *
     * @private
     * @param {String|Object} args Download ID of the download to check, or an object
     *                             containing a .downloadId property containing such.
     * @return {Ext.Promise} Promise which will receive an up-to-date copy of the
     *                       Ext.space.files.Download
     */
    getProgress: function(args) {
        var id, promise, match, manager = this;

        if (args) {
            promise = promisize(args, {supportProgress: false});
            id = typeof args == "number" ? args : extract(args, "downloadId");

            if (id && manager.downloads[id]) {
                if (manager.downloads[id].isComplete) {
                    // if it's cached and complete, return it
                    promise.fulfill(manager.downloads[id]);

                } else {
                    // if it's cached and incomplete, get it from getDownloads
                    this.getDownloads().then(function(downloads) {
                        downloads.some(function(download) {
                            if (download.downloadId === id) {
                                match = download;
                                return true;
                            }
                        });

                        if (match) {
                            promise.fulfill(match);
                        } else {
                            promise.reject("Download " + id + " not found");
                        }

                    }, function(error) {
                        promise.reject(error);
                    });
                }
            }


        }

        if (!args || !id) {
            if (!promise) {
                promise = new Ext.Promise();
            }
            promise.reject("Missing download ID");
        } else if (!manager.downloads[id]) {
            promise.reject("Download " + id + " not found");
        }

        return promise;
    },

    /**
     * Cancel a download (normally done via download.cancel()).
     *
     * @private
     * @param {String|Object} args Download ID of the download to check, or an object
     *                             containing a .downloadId property containing such.
     * @return {Ext.Promise} Promise which will resolve when the download is canceled. If
     *                       the download is already done or canceled, it will reject.
     */
    cancel: function(args) {
        var id, promise = new Ext.Promise(), manager = this;

        if (args) {
            promise = promisize(args, {supportProgress: false});
            id = extract(args, "downloadId");

            if (id) {
                Ext.space.Communicator.send({
                    command: "DownloadManager#cancel",
                    downloadId: id,
                    callbacks: {
                        onSuccess: function() {
                            promise.fulfill(true);
                        },
                        onError: function(error) {
                            promise.reject(error);
                        }
                    }
                });
            }
        }

        if (!args || !id) {
            promise.reject("Missing download ID");
        }

        return promise;
    },

    /**
     * Watch for updates coming in from the native bridge, to keep the internal
     * cache up to date
     *
     * @private
     */
    watchDownloads: function() {
        var manager = this,
            cache = this.downloads,
            promises = this.promises,
            activeCount = 0;

        function processItem(item) {
            var id = item.downloadId,
                alreadyComplete = !(id in cache) || cache[id].isComplete,
                justCompleted = !alreadyComplete && item.isComplete;

            // count the downloads still in progress to we know when to unwatch
            // (we check totalBytes and fileName because if an invalid bridge call
            // makes it through, the native side will return an object with zeroes
            // across the board, no filename, and isComplete == false)
            if (!item.isComplete && downloadIsReal(item)) {
                activeCount++;
            }

            // create or update the cached download object
            if (cache[id]) {
                cache[id]._updateWith(item);
            } else {
                cache[id] = new Ext.space.files.Download(item);
            }

            // resolve the original promise with the final data
            if (justCompleted && (id in promises)) {
                promises[id].fulfill(cache[id]);
            }
        }

        if (!manager.watching) {
            manager.watching = true;
            Ext.space.Communicator.send({
                command: "DownloadManager#watchDownloads",
                callbacks: {
                    onSuccess: function(responses) {
                        activeCount = 0;
                        if (Object.prototype.toString.call(responses) === "[object Array]") {
                            responses.forEach(processItem);
                            if (!activeCount) {
                                manager.unwatchDownloads();
                            }
                        }
                    },
                    onError: function(error) {
                        manager.unwatchDownloads();
                    }
                }
            });
        }
    },

    /**
     * Discontinue watching for download updates from the native bridge
     *
     * @private
     */
    unwatchDownloads: function() {
        if (this.watching) {
            Ext.space.Communicator.send({
                command: "DownloadManager#unwatchDownloads"
            });
            this.watching = false;
        }
    }
});

}());

(function() {

// utility function to reject the given promise with the first parameter passed to
// the callback; intended as a shorthand for creating bridge call error handlers that
// simply bail out when something goes wrong
function reject(promise) {
    return function(error) {
        promise.reject(error);
    };
}


/**
* Key/Value store for files. A collection represents a flat grouping of files in an
* application's file system, and it allows you to do basic CRUD operations on the
* files contained therein. Typically you don't instantiate a collection yourself;
* use Ext.space.SecureFiles.get() to create one.
*
* The `file` objects used in this API are instances of Ext.space.files.File.
*
* To create a collection:
*
*       var myCollection = Ext.space.SecureFiles.get("secrets");
*
* To retrieve file contents:
*
*       myCollection.get("someFile.txt").then(function(contents) {
*           // got 'em
*       });
*
* To write file contents:
*
*       myCollection.set("someFile.txt", "The new contents").then(function(file) {
*           // `file` is the Ext.space.files.File that was written
*       });
*
* ...and more. See the individual methods for full documentation.
*
*/
Ext.define("Ext.space.files.Collection", {
    /**
     * @private
     * @type {String}
     * Root virtual path for the files in this collection
     */
    name: null,

    /**
     * @private
     * @type {Object}
     * Hash of files descriptors in this collection, with the form {key: "", file: {...}}
     */
    files: null,

    /**
     * @private
     */
    constructor: function(name) {
        // store the collection name and create the file cache
        this.name = name;
        this.files = {};
    },

    /**
     * Transform a file descriptor loaded from the bridge into a key+file object
     * and put it in our local catalog.
     *
     * @private
     * @param {Object} obj File descriptor object (as a property bag)
     * @return {Ext.space.files.File} File object
     */
    _cache: function(obj) {
        // the bridge returns file data with internal keys/IDs included,
        // but we don't want to provide those to our consuming code, so
        // we strip that out, then cache file data alongside its key
        var file = this._makeFile(obj);
        var id = file.name;
        if (this.files[id]) {
            // update the cached file
            this.files[id].file._updateWith(obj);
        } else {
            // cache a new one
            this.files[id] = {
                key: obj.key,
                file: file
            };
        }
        return this.files[id];
    },

    /**
     * Bulk load an array of file descriptors loaded from the bridge into our cache.
     *
     * @private
     * @param {Array} results Results of a bridge query
     * @return {Array} Array of the Ext.space.files.File objects that got cached
     */
    _cacheResults: function(results) {
        return results.map(this._cache.bind(this));
    },

    /**
     * Transform a property bag file descriptor object into a real Ext.space.files.File.
     *
     * @private
     * @param {Object} obj File descriptor object (as a property bag)
     * @return {Ext.space.files.File} File object
     */
    _makeFile: function(obj) {
        var key = obj.key, file = new Ext.space.files.File(obj);

        // TODO: there's currently no method that invokes #renameFile or #getFile
        file.getContents = this._loadContents.bind(this, key);
        file.setContents = this._writeContents.bind(this, key);
        file.remove = this._removeFile.bind(this, key);
        file.view = this._viewFile.bind(this, key);

        return file;
    },

    /**
     * Retrieve an item from the local catalog, by name or File object.
     *
     * @private
     * @param {String} fileOrName File name as a string, or Ext.space.files.File object
     * @return {Ext.space.files.File} File descriptor object
     */
    _getItemByName: function(fileOrName) {
        return this.files[fileOrName.name || fileOrName];
    },

    /**
     * Retrieve an item from the local catalog, by key
     *
     * @private
     * @param {String} key File key
     * @return {Ext.space.files.File} File descriptor object
     */
    _getItemByKey: function(key) {
        var match;
        Object.keys(this.files).some(function(name) {
            if (this.files[name].key === key) {
                match = this.files[name];
                return true;
            }
        }, this);
        return match;
    },

    /**
     * Query the collection for files matching the given criteria. See the main
     * Ext.space.SecureFiles.query() documentation for query definitions.
     *
     * @param {Object} query (optional) Query object
     * @param {Object} options (optional) Query options
     * @return {Ext.Promise} Promise that resolves with the Ext.space.files.File
     *                       objects that match the criteria.
     */
    _query: function(query, options) {
        var result = new Ext.Promise();
        var qry = {path: this.name};

        if (query) {
            // copy the query as is
            if (query.name) { qry.name = query.name; }
            if (query.type) { qry.type = query.type; }
            if (query.createdBefore) { qry.createdBefore = query.createdBefore; }
            if (query.createdAfter) { qry.createdAfter = query.createdAfter; }
            if (query.modifiedBefore) { qry.modifiedBefore = query.modifiedBefore; }
            if (query.modifiedAfter) { qry.modifiedAfter = query.modifiedAfter; }
        }

        if (options) {
            options.collection = this;
        } else {
            options = {collection: this};
        }

        return Ext.space.SecureFiles.query(qry, options);
    },

    /**
     * Load a file descriptor from the filesystem, by name.
     *
     * @private
     * @param {String} name File name
     * @return {Ext.Promise} Promise that resolves with the file's cached catalog object;
     *                       if the file isn't found, the promise rejects.
     */
    _loadFile: function(name) {
        // Note that this method exhibits behavior slightly different than the native
        // bridge's #queryFiles operation being used here. The bridge considers a
        // zero-length result to still be a success as long as the operation doesn't
        // encounter an error of some sort. Since this method is simply attempting
        // to load metadata for a file, if the query itself succeeds but the file
        // doesn't exist, we reject the promise. That allows consuming code to, e.g.,
        // go back and create a file, then retry whatever it was doing.
        var result = new Ext.Promise();
        var collection = this;

        this._query({ name: name }).then(this._cacheResults.bind(this)).then(function(items) {
            // there really only should be a single match here; what
            // should we do if there's more than one?
            if (items.length) {
                result.fulfill(items[0]);
            } else {
                result.reject("File not found: " + collection.name + " :: " + name);
            }
        });
        return result;
    },

    /**
     * Retrieve the contents of a file by key.
     *
     * @private
     * @param {String} key File key
     * @param {Ext.space.files.File} file (optional) File object, to pass file descriptor data through into the promise
     * @return {Ext.Promise} Promise that resolves with the file's contents, plus possibly the file descriptor data
     */
    _loadContents: function(key, file) {
        var result = new Ext.Promise();
        Ext.space.Communicator.send({
            command: "Files#getFileContents",
            key: key,
            callbacks: {
                onSuccess: function(contents) {
                    result.fulfill(contents, file);
                },
                onError: reject(result)
            }
        });
        return result;
    },

    /**
     * Create a file by name, with optional type, path, and contents.
     *
     * @private
     * @param {String} name File name
     * @param {Object} props (optional) Hash with extra data in .type  and/or .contents
     * @return {Ext.Promise} Promise that resolves with the Ext.space.files.File object created
     */
    _createFile: function(name, props) {
        var result = new Ext.Promise();
        var collection = this;

        var args = {
            command: "Files#createFile",
            path: this.name,
            name: name,
            callbacks: {
                onSuccess: function(fileData) {
                    result.fulfill(collection._cache(fileData).file);
                },
                onError: reject(result)
            }
        };

        // add the optional parameters
        if (props) {
            if (props.type) { args.type = props.type; }
            if (props.contents) { args.fileData = props.contents; }
        }

        Ext.space.Communicator.send(args);

        return result;
    },

    /**
     * Launch the native viewer for a file by key.
     *
     * @private
     * @param {String} key File key
     * @return {Ext.Promise} Promise that resolves when the viewer is launched
     */
    _viewFile: function(key) {
        var result = new Ext.Promise();
        Ext.space.Communicator.send({
            command: "Files#viewFile",
            key: key,
            callbacks: {
                onSuccess: function() {
                    result.fulfill();
                },
                onError: reject(result)
            }
        });
        return result;
    },

    /**
     * Remove a file from disk.
     *
     * @private
     * @param {String} key File key
     * @return {Ext.Promise} Promise that resolves when the file is removed
     */
    _removeFile: function(key) {
        var result = new Ext.Promise();
        var collection = this;
        var file = this._getItemByKey(key).file;

        Ext.space.Communicator.send({
            command: "Files#removeFile",
            key: key,
            callbacks: {
                onSuccess: function() {
                    // remove the cached item from the collection's internal catalog
                    Object.keys(collection.files).some(function(k) {
                        if (k === file.name) {
                            delete collection.files[k];
                            return true;
                        }
                    });
                    result.fulfill(true);
                },
                onError: reject(result)
            }
        });

        return result;
    },

    /**
     * Write the contents of a file by key.
     *
     * @private
     * @param {String} key File key
     * @param {String} contents Contents to write
     * @return {Ext.Promise} Promise that resolves with the File object having been written
     */
    _writeContents: function(key, contents) {
        // note: only call this method if you're sure the file already exists;
        //       otherwise the bridge will invoke the onError handler
        var result = new Ext.Promise();
        var collection = this;

        Ext.space.Communicator.send({
            command: "Files#setFileContents",
            key: key,
            fileData: contents,
            callbacks: {
                onSuccess: function() {
                    result.fulfill(collection._getItemByKey(key).file);
                },
                onError: reject(result)
            }
        });

        return result;
    },


    /**
     * Get the file contents for a name.
     *
     *      var files = Ext.space.SecureFiles.get('secrets');
     *
     *      files.get('myFile').then(function(contents){
     *          // do something with the contents of the file.
     *      });
     *
     * @param {String} name File name for which to retrieve contents
     * @return {Ext.Promise} Promise that resolves when the contents are available
     *
     */
    get: function(name) {
        var result, item = this._getItemByName(name);
        var collection = this;

        function loadContents(catalogItem) {
            return collection._loadContents(catalogItem.key, catalogItem.file);
        }

        if (item && item.key) {
            // we have the key, let's go straight to loading the contents
            result = loadContents(item);
        } else {
            // couldn't find the key in cache (weird, why?), so re-query for the file
            result = this._loadFile(name).then(loadContents, function(error) { result.reject(error); });
        }
        return result;
    },

    /**
     * Write the given contents to a file.
     *
     *      var files = Ext.space.SecureFiles.get('secrets');
     *
     *      files.set('myFile', 'the contents go here').then(function(file) {
     *          // can do something with `file` here
     *      });
     *
     * @param {String|Object} name File name to which to write contents, or an object
     *                             with properties specifying the name and MIME type
     *                             of the file, e.g., `{name: "foo", type: "text/plain"}`.
     *                             Note that the type will only be stored if the file
     *                             is being created; if the file already exists, any
     *                             provided type will be ignored
     * @param {String} contents Contents to write
     * @return {Ext.Promise} Promise that resolves when the file is written
     */
    set: function(name, contents) {
        var result, item, type, collection = this;

        if (typeof name === "object") {
            type = name.type;
            name = name.name;
        }

        item = this._getItemByName(name);

        function writeContents(catalogItem) {
            return collection._writeContents(catalogItem.key, contents);
        }
        function createWithContents() {
            // if the file doesn't exist, create it with the given contents
            collection._createFile(name, {contents: contents, type: type}).then(function(file) {
                result.fulfill(file);
            });
        }

        if (item && item.key) {
            // we have the key, let's go straight to writing
            result = writeContents(item);
        } else {
            // couldn't find the key in cache (weird, why?), so re-query for the file
            this._loadFile(name).then(writeContents, createWithContents);
            result = new Ext.Promise();
        }
        return result;
    },

    /**
     * Query the collection for files matching the given criteria. See the main
     * Ext.space.SecureFiles.query() documentation for query definitions.
     *
     * @param {Object} query (optional) Query object
     * @param {Object} options (optional) Query options
     * @return {Ext.Promise} Promise that resolves with the Ext.space.files.File
     *                       objects that match the criteria.
     */
    query: function(query, options) {
        return this._query(query, options).then(this._cacheResults.bind(this)).then(function(items) {
            return items.map(function(item) { return item.file; });
        });
    },

    /**
     * Delete all of the files in this collection.
     *
     * @return {Ext.Promise} Promise that resolves when the files are deleted
     */
    clear: function() {
        var result = new Ext.Promise();
        var collection = this;

        function getFileKey(name) { return collection.files[name].key; }
        function removeFile(key) { return collection._removeFile(key); }
        function done() { result.fulfill(); }

        this._query().then(this._cacheResults.bind(this)).then(function(items) {
            Ext.Promise.whenComplete(Object.keys(this.files).map(getFileKey).map(removeFile)).then(done);
        }.bind(this));

        return result;
    },

    /**
     * Returns a count of the total number of files in the collection.
     *
     *      var secrets = Ext.space.SecureFiles.get('secrets');
     *
     *      secrets.count().then(function(count) {
     *          // done
     *      });
     *
     * @return {Ext.Promise} Promise that resolves with the number of files in the collection
     */
    count: function() {
        var result = new Ext.Promise();
        this._query(null, { fetch: "count" }).then(function(qty) {
            result.fulfill(qty);
        });
        return result;
    },


    /**
     * Checks to see if the given file exists.
     *
     *      var secrets = Ext.space.SecureFiles.get('secrets');
     *
     *      secrets.has('myFile'.then(function(hasKey) {
     *          // check hasKey
     *      });
     *
     * @param {String} name Name of the file for which to search
     * @return {Ext.Promise} Promise that resolves with a boolean indicating presence of the file
     */
    has: function(name) {
        var result = new Ext.Promise();
        this._loadFile(name).then(function() {
            result.fulfill(true);
        }, function(error) {
            result.fulfill(false);
        });
        return result;
    },

    /**
     * Deletes the file (if present).
     *
     *      var secrets = Ext.space.SecureFiles.get('secrets');
     *
     *      secrets.remove('myFile').then(function(done) {
     *          // done
     *      });
     *
     * @param {String} name Name of the file to delete
     * @return {Ext.Promise} Promise that resolves when the file is deleted
     *
     */
    remove: function(name) {
        var result, item = this._getItemByName(name);
        var collection = this;

        function removeFile(catalogItem) {
            return collection._removeFile(catalogItem.key);
        }

        if (item && item.key) {
            // we have the key, let's go straight to removing it
            result = removeFile(item);
        } else {
            // load it to get the key; if it's not found, act as though we succeeded
            result = this._loadFile(name).then(removeFile, function(error) { result.fulfill(true); });
        }

        return result;
    },

    /**
     * Alias for .remove()
     *
     * @private
     * @return {Ext.Promise} the promise that will resolve when the value is checked
     */
    delete: function(name) {
        return this.remove.apply(this, arguments);
    },


    /**
     * Launches the viewer for a file.
     *
     *      var secrets = Ext.space.SecureFiles.get('secrets');
     *
     *      secrets.view('myFile').then(function() {
     *          // launched
     *      });
     *
     * @param {String} name Name of the file to view
     * @return {Ext.Promise} Promise that resolves when the file viewer is launched
     *
     */
    view: function(name) {
        var result, item = this._getItemByName(name);
        var collection = this;

        function viewFile(catalogItem) {
            return collection._viewFile(catalogItem.key);
        }

        if (item && item.key) {
            // we have the key, let's go straight to removing it
            result = viewFile(item);
        } else {
            // load it to get the key
            result = this._loadFile(name).then(viewFile, reject(result));
        }

        return result;
    },


    /**
     * Generate a list of all the names of the files in the collection, in no
     * particular order.
     *
     *      var secrets = Ext.space.SecureFiles.get('secrets');
     *
     *      secrets.keys().then(function(keys) {
     *          // array of file names
     *      });
     *
     * @return {Ext.Promise} Promise that will resolve when all of the keys have been collected.
     *
     */
    keys: function() {
        var result = new Ext.Promise();
        this._query().then(this._cacheResults.bind(this)).then(function(items) {
            result.fulfill(Object.keys(this.files));
        }.bind(this));
        return result;
    },


    /**
     * Iterates over all the files in a collection
     *
     *      var secrets = Ext.space.SecureFiles.get('secrets');
     *
     *      secrets.forEach(function(file) {...}).then(function() {
     *          // done
     *      });
     *
     * @param {Function}  callback Function to call once for each file in the collection.
     *                             As with Array.prototype.forEach, it receives three
     *                             parameters: an Ext.space.files.File object, its index
     *                             in the array being iterated, and the array of files
     *                             itself. Note however that the order of elements in
     *                             this array are NOT guaranteed in any way.
     * @param {Object} thisArg (optional) Value to use for `this` when executing the callback.
     * @return {Ext.Promise} Promise that resolves with an array of the File objects
     *                       operated on, after the callback has been run across the
     *                       entire collection.
     */
    forEach: function(callback, thisArg) {
        var result = new Ext.Promise();
        var args = arguments;
        this._query().then(this._cacheResults.bind(this)).then(function(items) {
            var files = items.map(function(item) { return item.file; });
            files.forEach.apply(files, args);
            result.fulfill(files);
        }.bind(this));
        return result;
    }

});

})();

/**
 * @private
 * The File class is used to represent a file in the file system. It's little more
 * than a property bag, but with documentation. Typically you don't instantiate these
 * yourself, but use an Ext.space.files.Collection object to create them.
 */
Ext.define("Ext.space.files.File", {


    /**
     * File system key
     * @readonly
     * @type {String}
     */
    key: null,


    /**
     * Filename (excluding path)
     * @readonly
     * @type {String}
     */
    name: null,

    /**
     * Creation timestamp
     * @readonly
     * @type {Date}
     */
    created: null,

    /**
     * Last Modified timestamp
     * @readonly
     * @type {Date}
     */
    modified: null,

    /**
     * MIME type
     * @readonly
     * @type {String}
     */
    mimeType: null,

    /**
     * Simplified file type
     * @readonly
     * @type {String}
     */
    type: null,

    /**
     * Name of the application that created/owns this file
     * @readonly
     * @type {String}
     */
    appName: null,

    /**
     * ID of the application that created/owns this file
     * @readonly
     * @type {String}
     */
    appId: null,

    /**
     * Virtual path to the file
     * @readonly
     * @type {String}
     */
    path: null,

    /**
     * File size in bytes
     * @readonly
     * @type {Number}
     */
    size: 0,

    /**
    * @private
    */
    constructor: function(args) {
        this._updateWith(args);
    },

    /**
     * Bulk update this file object with the data provided.
     *
     * @private
     * @param {object} source Object with data to overwrite onto this File
     */
    _updateWith: function(source) {
        if (source) {
            if (source.name) { this.name = source.name; }
            if (source.key) { this.key = source.key; }

            // convert dates from epoch seconds
            if (source.created) { this.created = new Date(source.created * 1000); }
            if (source.modified) { this.modified = new Date(source.modified * 1000); }

            if (source.type) { 
                this.mimeType = source.type;

                this.type = source.type.substring(source.type.indexOf("/")+1);
             }
            if (source.appName) { this.appName = source.appName; }
            if (source.appId) { this.appId = source.appId; }
            if (source.size) { this.size = source.size; }
        }
        return this;
    },

    /**
     * Fetch the contents of the file.
     *
     *      file.getContents().then(function(contents) {
     *          // do something with the contents
     *      });
     *
     * @return {Ext.Promise} Promise that resolves when the contents are fetched
     *
     * @alias Ext.space.Collection.get
     */
    getContents: function() {
        // this is just a stub; the Collection will create the real method when
        // the File is instantiated
    },

    /**
     * Write contents to the file.
     *
     *      file.setContents(contents).then(function() {
     *          // success
     *      });
     *
     * @param {String} contents File contents to write
     * @return {Ext.Promise} Promise that resolves when the contents are fetched
     *
     * @alias Ext.space.Collection.set
     */
    setContents: function(contents) {
        // this is just a stub; the Collection will create the real method when
        // the File is instantiated
    },

    /**
     * Remove this file from disk.
     *
     *      file.remove().then(function(success) {
     *          // success?
     *      });
     *
     * @return {Ext.Promise} Promise that resolves when the file is removed
     *
     * @alias Ext.space.Collection.set
     */
    remove: function(contents) {
        // this is just a stub; the Collection will create the real method when
        // the File is instantiated
    },

    /**
     * Open the native viewer for this file.
     *
     *      file.view().then(function() {
     *          // launched
     *      });
     *
     * @return {Ext.Promise} Promise that resolves when the viewer is launched
     */
    view: function() {
        // this is just a stub; the Collection will create the real method when
        // the File is instantiated
    }
});

/**
 * @private
 * The Download class which is used to represent a downloading file. It's basically
 * a property bag with two methods: getProgress() and cancel().
 */
Ext.define("Ext.space.files.Download", {
    /**
     * Internal identifier for this download
     * @type {String}
     */
    downloadId: null,

    /**
     * Source URL
     * @type {String}
     */
    url: null,

    /**
     * MIME type
     * @type {String}
     */
    mimeType: null,

    /**
     * Progress so far
     * @type {Number}
     */
    bytesDownloaded: 0,

    /**
     * Final size
     * @type {Number}
     */
    totalBytes: 0,

    /**
     * Download status
     * @type {Boolean}
     */
    isComplete: false,

    /**
     * When the download initiated
     * @type {Date}
     */
    
    dateStarted: null,

    /**
     * Destination file path/name
     * @type {String}
     */
    fileName: null,

    /**
     * @private
     */
    constructor: function(args) {
        this._updateWith(args);
        this.progress = new Ext.space.Observable();
    },


    onProgress:function(callback, scope){
        this.progress.addListener(callback, scope);
    },

    /**
     * Check this download's progress.
     *
     * @return {Ext.Promise} Promise which will fulfill when progress is fetched and
     *                       updated into this object (and which is resolved with this
     *                       download as a parameter too).
     */
    getProgress: function() {
        return Ext.space.Downloads.getProgress(this);
    },

    /**
     * Cancel this download.
     *
     * @return {Ext.Promise} Promise which will fulfills when the download is
     *                       successfully canceled. If the download is already done,
     *                       the promise will reject.
     */
    cancel: function() {
        return Ext.space.Downloads.cancel(this);
    },

    /**
     * Bulk update this download with the data provided.
     *
     * @private
     * @param {object} source Object with data to overwrite onto this Download
     */
    _updateWith: function(source) {
        if (source) {
            if (source.downloadId) { this.downloadId = source.downloadId; }
            if (source.url) { this.url = source.url; }
            if (source.mimeType) { this.mimeType = source.mimeType; }
            if (source.bytesDownloaded) { this.bytesDownloaded = source.bytesDownloaded; }
            if (source.totalBytes) { this.totalBytes = source.totalBytes; }
            if (source.isComplete) { this.isComplete = true; }
            if (source.dateStarted) { this.dateStarted = new Date(source.dateStarted * 1000); }
            if (source.fileName) { this.fileName = source.fileName; }
        }
        if(this.progress){
            this.progress.invokeListeners(this);
        }
        return this;
    }
});

(function() {
    window.__evaluate = function(base64Encoded) {
        var script = atob(base64Encoded);

        DEBUG && console.log('[EVALUATE] ', script);

        setTimeout(function() {
            try {
                eval(script);
            }
            catch (e) {
                if (e.constructor !== Error) {
                    DEBUG && console.error("[EVALUATE][ERROR] Failed evaluating script. Error: ", e.toString(), ". Script: ", script);
                }
                else {
                    throw e;
                }
            }
        }, 1);
    };

    if (Ext.isSpace || Ext.spaceIsWindowsPhone) {
        function notifyNative() {
            Ext.space.Communicator.notifyReady();
        }

        if ('onReady' in Ext) {
            Ext.onReady(notifyNative);
        }
        else if (!Ext.spaceIsWindowsPhone && document.readyState.match(/interactive|complete|loaded/) !== null) {
            notifyNative();
        }
        else {
            window.addEventListener('DOMContentLoaded', notifyNative, false);
        }
    }
})();
