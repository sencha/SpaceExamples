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
            logServer = script.getAttribute('logServer') || 'http://localhost:9876/log';

        function doLog(message, type) {
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

(function(global) {
    var Ext = global.Ext;

    if (typeof Ext == 'undefined') {
        global.Ext = Ext = {};
    }

    var Base = function() {};

    Base.prototype = {
        constructor: function() {}
    };

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

    var match = typeof window != 'undefined' && window.navigator.userAgent.match(/SenchaSpace\/([0-9\.]+)/),
        readyListeners = [];

    if (match) {
        Ext.isSpace = true;
        Ext.spaceVersion = match[1];
    }

    Ext.apply = function(object, config) {
        var key, value;

        for (key in config) {
            value = config[key];
            object[key] = value;
        }

        return object;
    };

    Ext.isSpaceReady = false;
    Ext.onSpaceReady = function(callback, scope) {
        if (!Ext.isSpace) {
            return;
        }

        if (!Ext.isSpaceReady) {
            readyListeners.push(arguments);
        }
        else {
            callback.call(scope);
        }
    };
    Ext.setSpaceReady = function() {
        Ext.isSpaceReady = true;

        var ln = readyListeners.length,
            i = 0,
            listener;

        for (; i < ln; i++) {
            listener = readyListeners[i];
            listener[0].call(listener[1]);
        }

        readyListeners.length = 0;
    }
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
            target = document.querySelector('head > title'),
            observer = new window.WebKitMutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    me.send({
                        command: 'TitleWatcher#update',
                        title: mutation.target.textContent
                    });
                });
            });

        target && observer.observe(target, { subtree: true, characterData: true, childList: true });
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

        data.callback.apply(data.scope, args);
    },

    send: function(args, synchronous) {
        if (!Ext.isSpaceReady) {
            if (synchronous) {
                throw new Error('Making synchronous request while Space isn\'t yet ready. ' +
                    'Please wrap the statement inside Ext.onSpaceReady(callback)');
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

    doSend: function(args, synchronous) {
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

        DEBUG && console.log("[OUT]", data);

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
            catch (e) {}

            return response;
        }
    }
});

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
             * @param [result]
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

    then: function(scope, success, error) {
        if (typeof scope == 'function') {
            error = success;
            success = scope;
            scope = null;
        }

        if (typeof success == 'string') {
            success = scope[success];
        }

        if (typeof error == 'string') {
            error = scope[error];
        }

        return this.doThen(scope, success, error);
    },

    doThen: function(scope, success, error) {
        var Promise = Ext.Promise,
            completed = this.completed,
            promise, result;

        if (completed === -1) {
            if (error) {
                error.call(scope, this.lastReason);
            }
            return this;
        }

        if (completed === 1 && !this.isFulfilling) {
            if (!success) {
                return this;
            }

            result = success.apply(scope, this.lastResults);

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
                scope: scope,
                success: success,
                error: error,
                promise: promise
            });
        }

        return promise;
    },

    error: function(scope, error) {
        if (typeof scope == 'function') {
            error = scope;
            scope = null;
        }

        if (typeof error == 'string') {
            error = scope[error];
        }

        return this.doThen(scope, null, error);
    },

    fulfill: function() {
        var results = arguments,
            listeners, listener, scope, success, promise, callbackResults;

        this.lastResults = results;
        this.completed = 1;

        while (listeners = this.getListeners()) {
            delete this.listeners;
            this.isFulfilling = true;

            while (listener = listeners.shift()) {
                success = listener.success;

                if (success) {
                    scope = listener.scope;
                    promise = listener.promise;
                    delete promise.$owner;

                    callbackResults = success.apply(scope, results);

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

        me.then(promise, function(result) {
            this.fulfill(result);
            return result;
        }, 'reject');
    },

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
                    error.call(listener.scope, reason);
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
    }
});

/**
 * This class allows you to use native APIs to take photos using the device camera.
 *
 * When this singleton is instantiated, it will automatically select the correct implementation depending on the
 * current device:
 *
 * - Sencha Packager
 * - PhoneGap
 * - Simulator
 *
 * Both the Sencha Packager and PhoneGap implementations will use the native camera functionality to take or select
 * a photo. The Simulator implementation will simply return fake images.
 *
 * ## Example
 *
 * You can use the {@link Ext.space.Camera#capture} function to take a photo:
 *
 *     Ext.space.Camera.capture({
 *         success: function(image) {
 *             imageView.setSrc(image);
 *         },
 *         quality: 75,
 *         width: 200,
 *         height: 200,
 *         destination: 'data'
 *     });
 *
 * See the documentation for {@link Ext.space.Camera#capture} all available configurations.
 *
 * @mixins Ext.space.camera.Abstract
 *
 * @aside guide native_apis
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
     * - **camera** - prompts the user to take a new photo
     * - **library** - prompts the user to choose an image from the library
     *
     * @param {String} destination
     * The destination of the image which is returned. Available options are:
     *
     * - **data** - returns a base64 encoded string
     * - **file** - returns the file's URI
     *
     * @param {String} encoding
     * The encoding of the returned image. Available options are:
     *
     * - **jpg**
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
            source = options.source,
            destination = options.destination,
            encoding = options.encoding;

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
                success: options.success,
                failure: options.failure
            },
            scope: options.scope,
            quality: options.quality,
            width: options.width,
            height: options.height,
            source: source,
            destination: destination,
            encoding: encoding
        });
    }
});

/**
 * This class is used to check if the current device is currently online or not. It has three different implementations:
 *
 * - Sencha Packager
 * - PhoneGap
 * - Simulator
 *
 * Both the Sencha Packager and PhoneGap implementations will use the native functionality to determine if the current
 * device is online. The Simulator version will simply use `navigator.onLine`.
 *
 * When this singleton ({@link Ext.space.Connection}) is instantiated, it will automatically decide which version to
 * use based on the current platform.
 *
 * ## Examples
 *
 * Determining if the current device is online:
 *
 *     alert(Ext.space.Connection.isOnline());
 *
 * Checking the type of connection the device has:
 *
 *     alert('Your connection type is: ' + Ext.space.Connection.getType());
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
    WIFI: 'WiFi connection',

    /**
     * @property {String} CELL_2G
     * Text label for a connection type.
     */
    CELL_2G: 'Cell 2G connection',

    /**
     * @property {String} CELL_3G
     * Text label for a connection type.
     */
    CELL_3G: 'Cell 3G connection',

    /**
     * @property {String} CELL_4G
     * Text label for a connection type.
     */
    CELL_4G: 'Cell 4G connection',

    /**
     * @property {String} NONE
     * Text label for a connection type.
     */
    NONE: 'No network connection',

    startWatching: function() {
        Ext.space.Communicator.send({
            command: 'Connection#watch',
            callbacks: {
                callback: this.doConnectionChange
            },
            scope: this
        });
    },

    getStatus: function(config) {
        Ext.space.Communicator.send({
            command: 'Connection#getStatus',
            callbacks: {
                callback: config.callback
            },
            scope: config.scope
        });
    },

    onConnectionChange: function() {
        this.addListener.apply(this, arguments);
    },

    doConnectionChange: function(e) {
        this.invokeListeners(!!e.online, this[e.type]);
    }
});

/**
 * Provides a cross device way to show notifications. There are three different implementations:
 *
 * - Sencha Packager
 * - PhoneGap
 * - Simulator
 *
 * When this singleton is instantiated, it will automatically use the correct implementation depending on the current device.
 *
 * Both the Sencha Packager and PhoneGap versions will use the native implementations to display the notification. The
 * Simulator implementation will use {@link Ext.MessageBox} for {@link #show} and a simply animation when you call {@link #vibrate}.
 *
 * ## Examples
 *
 * To show a simple notification:
 *
 *     Ext.space.Notification.show({
 *         title: 'Verification',
 *         message: 'Is your email address: test@sencha.com',
 *         buttons: Ext.MessageBox.OKCANCEL,
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
});

Ext.define('Ext.space.invoke.Connection', {
    constructor: function(receiverId) {
        this.receiverId = receiverId;
    },

    send: function(message, foreground) {
        return Ext.space.Invoke.send(this.receiverId, message, foreground);
    },

    receive: function(message) {}
});

/**
 * Example for a sender:
 *
 *      Ext.require('Ext.space.Invoke', function(Invoke) {
 *          var broadcast = Invoke.broadcast('time'),
 *              connectToFirstReceiver = broadcast.then(function(receivers){
 *                  return Invoke.connect(receivers[0].id);
 *              }),
 *              send = connectToFirstReceiver.then(function(connection) {
 *                  // 'true' as second argument to bring the receiver app to the foreground
 *                  // otherwise, it will simply run in the background
 *                  return connection.send('You are summoned!', true);
 *              });
 *
 *          send.then(function(reply){
 *              console.log(reply);
 *          });
 *      });
 *
 * Example for a receiver:
 *
 *      Ext.require('Ext.space.Invoke', function(Invoke) {
 *          Invoke.onConnect(function(appId) {
 *              console.log('Got connection from ' + appId);
 *
 *              // Accept all
 *              return true;
 *          });
 *
 *          Invoke.onMessage(function(appId, message) {
 *              console.log('Got message from ' + appId + ' ' + message);
 *
 *              return 'Yeah I got it';
 *          });
 *      });
 *
 * For aync message handling:
 *
 *       Invoke.onMessage(function(appId, message) {
 *          var promise = new Ext.Promise();
 *
 *          console.log('Got message from ' + appId + ' ' + message);
 *
 *          // Do whatever needed asynchronously before return the result (fulfilling the promise)
 *          setTimeout(function(){
 *             promise.fulfill('Yeah I got it');
 *          }, 3000);
 *
 *          return promise;
 *      });
 */
Ext.define('Ext.space.Invoke', {
    singleton: true,

    messageId: 0,

    constructor: function() {
        this.pendingReceivePromises = {};
        this.connections = {};
        this.connectQueue = [];
        this.messageQueue = [];
    },

    invoke: function(messages) {
        var me = this;

        if (!Array.isArray(messages)) {
            throw new Error('[Invoke#invoke] Invalid messages, must be an array');
        }

        // Unblock native thread
        setTimeout(function() {
            messages.forEach(function(message) {
                me.onReceived(message);
            })
        }, 1);
    },

    /**
     * Create a connection to another application with the given id
     * @param {String} receiverId The id of the application to connect to. Get this id from #broadcast
     * @returns {Ext.Promise}
     */
//    connect: function(receiverId) {
//        var connections = this.connections,
//            connection = connections[receiverId];
//
//        if (connection) {
//            return Ext.Promise.from(connection);
//        }
//        else {
//            return this.send(receiverId, '__CONNECT__').then(function() {
//                connections[receiverId] = connection = new Ext.space.invoke.Connection(receiverId);
//                return connection;
//            });
//        }
//    },

    get: function(broadcastMessage) {
        var connections = this.connections,
            connection = connections[broadcastMessage];

        if (connection) {
            return Ext.Promise.from(connection);
        }
        else {
            return this.broadcast(broadcastMessage).then(this, function(receiverIds) {
                connections[broadcastMessage] = connection = new Ext.space.invoke.Connection(receiverIds[0].id);
                return connection;
            });
        }
    },

    /**
     * Send a message
     * @param {String} receiverId The id of the application to connect to. Get this id from #broadcast
     * @param {*} message The message to send, can be an object, as long as it is JSON-able.
     * @param {Boolean} [foreground] Whether or not to bring the receiver app to the foreground
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
     * Assign the callback to handle new connection. The boolean returned value dertermine whether or not to accept
     * the connection
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
     * Assign the callback to handling incoming messages. The returned value will be passed back to the sender.
     * If the operation needs to be async, simply return an instance of Ext.Promise
     * @param callback
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
                }
                else {
                    if (!messageCallback) {
                        this.messageQueue.push(arguments);
                        return;
                    }
                    else {
                        response = this.onAppMessage(appId, message);
                    }
                }

                if (response instanceof Ext.Promise) {
                    response.then(this, function(result) {
                        this.doSend(appId, messageId, {
                            success: result
                        }, foreground);
                    }, function(reason) {
                        this.doSend(appId, messageId, {
                            error: reason
                        }, foreground);
                    });
                }
                else {
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
     * Broadcast a message (intent) to look for receivers who can respond to it
     * @param message
     * @returns {Ext.Promise} A promise which provides an array of objects upon fulfilled. Each object contains information about
     * a receiver, with 'id', 'name' and 'icon' keys.
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
        if (this.insertId != 0) {
            return this.insertId;
        } else {
            throw new Error('Ext.space.sqlite.SqlResultSet#getInsertId: An SqlTransaction did not insert a row.');
            return null;
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
 * The SqlTransaction class which is used to execute Sql statements.
 */
Ext.define('Ext.space.sqlite.SqlTransaction', {
    id: 0,
    active: false,
    statements: null,

    constructor: function(id) {
        this.id = id;
        this.statements = [];
    },

    /**
     * Executes an Sql statement.
     *
     * @param {Object} config
     * The object which contains the following config options:
     *
     * @param {String} config.sqlStatement
     * The Sql statement to execute. This is required.
     *
     * @param {Array} config.arguments
     * The arguments array to bind each '?' placeholder in the Sql statement. This is optional.
     *
     * @param {Function} config.callback
     * The callback to be called when the Sql statement succeeded. This is optional.
     *
     * @param {Ext.space.sqlite.SqlTransaction} config.callback.transaction
     * The transaction of the Sql statement.
     *
     * @param {Ext.space.sqlite.SqlTransaction} config.callback.resultSet
     * The result of the Sql statement.
     *
     * @param {Function} config.failure
     * The callback to be called when an error occurred. This is optional.
     * If the callback returns false, next Sql statement will be executed.
     *
     * @param {Ext.space.sqlite.SqlTransaction} config.failure.transaction
     * The transaction of the Sql statement.
     *
     * @param {Object} config.failure.error
     * The occurred error.
     *
     * @param {Object} config.scope
     * The scope object
     */
    executeSql: function(config) {
        if (!this.active) {
            throw new Error('Ext.space.sqlite.SqlTransaction#executeSql: An attempt was made to use a SqlTransaction that is no longer usable.');
            return null;
        }

        if (config.sqlStatement == null) {
            throw new Error('Ext.space.sqlite.SqlTransaction#executeSql: You must specify a `sqlStatement` for the transaction.');
            return null;
        }

        this.statements.push({
            sqlStatement: config.sqlStatement,
            arguments: config.arguments,
            callback: config.callback,
            failure: config.failure,
            scope: config.scope
        });
    }
});

/**
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
     * @return {String}
     * The current database version.
     */
    getVersion: function() {
        return Ext.space.Communicator.send({
            command: 'Sqlite#getVersion',
            databaseId: this.id
        }, true);
    },

    /**
     * Performs a {@link Ext.space.sqlite.SqlTransaction} instance with a read/write mode.
     *
     * @param {Object} config
     * The object which contains the following config options:
     *
     * @param {Function} config.callback
     * The callback to be called when the transaction has been created. This is required.
     *
     * @param {Ext.space.sqlite.SqlTransaction} config.callback.transaction
     * The created transaction.
     *
     * @param {Function} config.success
     * The callback to be called when the transaction has been successfully commited. This is optional.
     *
     * @param {Function} config.failure
     * The callback to be called when an error occurred and the transaction has been rolled back. This is optional.
     *
     * @param {Object} config.failure.error
     * The occurred error.
     *
     * @param {Object} config.scope
     * The scope object
     */
    transaction: function(config) {
        if (!config.callback) {
            throw new Error('Ext.space.sqlite.Database#transaction: You must specify a `callback` callback.');
            return null;
        }

        var me = this;
        Ext.space.Communicator.send({
            command: 'Sqlite#createTransaction',
            databaseId: this.id,
            readOnly: config.readOnly,
            callbacks: {
                success: function(id) {
                    var exception = null;
                    var error = null;
                    var transaction = new Ext.space.sqlite.SqlTransaction(id);

                    error = Ext.space.Communicator.send({
                        command: 'Sqlite#beginTransaction',
                        transactionId: transaction.id
                    }, true);

                    if (!error && config.preflight) {
                        error = config.preflight.call(config.scope || this);
                    }

                    if (!error) {
                        try {
                            transaction.active = true;
                            config.callback.call(config.scope || this, transaction); // may throw exception
                        } catch (e) {
                            exception = e;
                        } finally {
                            transaction.active = false;
                        }
                    }

                    var statements = transaction.statements;

                    while (!(exception || error) && statements.length > 0) {
                        var statement = statements.shift();
                        var result = Ext.space.Communicator.send({
                            command: 'Sqlite#executeStatement',
                            transactionId: transaction.id,
                            databaseId: me.id,
                            version: me.version,
                            sqlStatement: statement.sqlStatement,
                            arguments: JSON.stringify(statement.arguments)
                        }, true);

                        if (result) {
                            if (result.error) {
                                error = result.error;
                            } else if (statement.callback) {
                                var resultSet = new Ext.space.sqlite.SqlResultSet(result);

                                try {
                                    transaction.active = true;
                                    statement.callback.call(statement.scope || this, transaction, resultSet); // may throw exception
                                } catch (e) {
                                    exception = e;
                                } finally {
                                    transaction.active = false;
                                }
                            }
                        }

                        if (error && statement.failure) {
                            try {
                                transaction.active = true;
                                if (!statement.failure.call(statement.scope || this, transaction, error)) { // may throw exception
                                    error = null;
                                }
                            } catch (e) {
                                exception = e;
                            } finally {
                                transaction.active = false;
                            }
                        }
                    }

                    if (!(exception || error)) {
                        error = Ext.space.Communicator.send({
                            command: 'Sqlite#commitTransaction',
                            transactionId: transaction.id
                        }, true);

                        if (!error) {
                            if (config.postflight) {
                                config.postflight.call(config.scope || this);
                            }

                            if (config.success) {
                                config.success.call(config.scope || this);
                            }
                        }
                    }

                    if (exception || error) {
                        statements.splice(0, statements.length);

                        Ext.space.Communicator.send({
                            command: 'Sqlite#rollbackTransaction',
                            transactionId: transaction.id
                        }, true);

                        if (exception) {
                            throw exception;
                        } else if (config.failure) {
                            config.failure.call(config.scope || this, error);
                        }
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
     * Works same as {@link Ext.space.sqlite.Database#transaction}, but performs a {@link Ext.space.sqlite.SqlTransaction} instance with a read-only mode.
     */
    readTransaction: function(config) {
        this.transaction(Ext.apply(config, {
            readOnly: true
        }));
    },

    /**
     * Verifies and changes the version of the database at the same time as doing a schema update with a {@link Ext.space.sqlite.SqlTransaction} instance.
     *
     * @param {Object} config
     * The object which contains the following config options:
     *
     * @param {String} config.oldVersion
     * The current version of the database. This is required.
     *
     * @param {String} config.newVersion
     * The new version of the database. This is required.
     *
     * @param {Function} config.callback
     * The callback to be called when the transaction has been created. This is optional.
     *
     * @param {Ext.space.sqlite.SqlTransaction} config.callback.transaction
     * The created transaction.
     *
     * @param {Function} config.success
     * The callback to be called when the transaction has been successfully commited. This is optional.
     *
     * @param {Function} config.failure
     * The callback to be called when an error occurred and the transaction has been rolled back. This is optional.
     *
     * @param {Object} config.failure.error
     * The occurred error.
     *
     * @param {Object} config.scope
     * The scope object
     */
    changeVersion: function(config) {
        if (config.oldVersion == null) {
            throw new Error('Ext.space.Sqlite#changeVersion: You must specify an `oldVersion` of the database.');
            return null;
        }

        if (config.newVersion == null) {
            throw new Error('Ext.space.Sqlite#changeVersion: You must specify a `newVersion` of the database.');
            return null;
        }

        this.transaction(Ext.apply(config, {
            preflight: function() {
                return config.oldVersion == this.getVersion() ? null : 'Unable to change version: version mismatch';
            },
            postflight: function() {
                var result = Ext.space.Communicator.send({
                    command: 'Sqlite#setVersion',
                    databaseId: this.id,
                    version: config.newVersion
                }, true);

                if (result) {
                    this.version = config.newVersion;
                }
            }
        }));
    }
});

Ext.define('Ext.space.Sqlite', {
    singleton: true,

    /**
     * Returns a {@link Ext.space.sqlite.Database} instance. If the database with specified name does not exist, it will be created.
     * If the creationCallback is provided, the database is created with the empty string as its version regardless of the specified version.
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
     * @param {Function} config.creationCallback
     * The callback to be called when the database has been created. This is optional.
     *
     * @param {Ext.space.sqlite.Database} config.creationCallback.database
     * The created database with the empty string as its version regardless of the specified version.
     *
     * @param {Object} config.scope
     * The scope object. This is optional.
     *
     * @return {Ext.space.sqlite.Database}
     * The opened database, null if an error occured.
     */
    openDatabase: function(config) {
        if (config.name == null) {
            throw new Error('Ext.space.Sqlite#openDatabase: You must specify a `name` of the database.');
            return null;
        }

        if (config.version == null) {
            throw new Error('Ext.space.Sqlite#openDatabase: You must specify a `version` of the database.');
            return null;
        }

        if (config.displayName == null) {
            throw new Error('Ext.space.Sqlite#openDatabase: You must specify a `displayName` of the database.');
            return null;
        }

        if (config.estimatedSize == null) {
            throw new Error('Ext.space.Sqlite#openDatabase: You must specify a `estimatedSize` of the database.');
            return null;
        }

        var database = null;

        var result = Ext.space.Communicator.send({
            command: 'Sqlite#openDatabase',
            name: config.name,
            version: config.version,
            displayName: config.displayName,
            estimatedSize: config.estimatedSize,
            callbacks: {
                // `creationCallback != null` is checked for internal logic in native plugin code
                creationCallback: !config.creationCallback ? null : function() {
                    config.creationCallback.call(config.scope || this, database);
                }
            },
            scope: config.scope || this
        }, true);

        if (result) {
            if (result.error) {
                throw new Error(result.error);
                return null;
            }

            database = new Ext.space.sqlite.Database(result.id, result.version);

            return database;
        }

        return null;
    }
});

/**
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

Ext.define('Ext.space.FileSystem', {
    singleton: true,

    /**
     * Requests a {@link Ext.space.filesystem.FileSystem} instance.
     *
     * @param {Object} config
     * The object which contains the following config options:
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

(function() {
    window.__evaluate = function(base64Encoded) {
        var script = atob(base64Encoded);

        console.log('[EVALUATE] ', script);

        setTimeout(function() {
            try {
                eval(script);
            }
            catch (e) {
                if (e.constructor !== Error) {
                    console.error("[EVALUATE][ERROR] Failed evaluating script. Error: ", e.toString(), ". Script: ", script);
                }
                else {
                    throw e;
                }
            }
        }, 1);

        return 'ok';
    };

    if (Ext.isSpace) {
        document.addEventListener("DOMContentLoaded", function() {
            var Communicator = Ext.space.Communicator,
                communicatorInitId;

            if (DEBUG) {
                $expect('Communicator#init to be called from native', 1000, Communicator, 'init');
            }

            communicatorInitId = Communicator.getCallbackId(Communicator.init, Communicator);

            // Notify native bridge
            window.location = 'sencha://ready.local/' + communicatorInitId;
        });
    }
})();
