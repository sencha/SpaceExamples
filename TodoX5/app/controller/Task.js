/**
 * @file Todo.controller.Task
 * @author Simon Brunel
 */
Ext.define('Todo.controller.Task', {
    extend: 'Ext.app.Controller',

    requires: [
        'Todo.model.Task'
    ],

    refs: {
        main: 'app-main'
    },

    control: {
        'tasklist': {
            taskcreate: '_onTaskCreate',
            taskmodify: '_onTaskModify',
            tasktoggle: '_onTaskToggle'
        },
        'taskedit': {
            taskcommit: '_onTaskCommit',
            taskdelete: '_onTaskDelete',
            taskcancel: '_onTaskCancel'
        }
    },

    /**
     * @private
     * Holds the current promise request (or NULL if any)
     */
    _promise: null,

    /**
     * @private
     * Updates and validates *record* with the given *values*, then if record is
     * valid, synchronizes the tasks store (*record* will be added if needed).
     */
    _save: function(record, values, callback, scope) {
        var store = Ext.getStore('Tasks'),
            errors = null,
            me = this;

        record.beginEdit();
        record.set(values);
        if (!record.dirty) {
            // nothing to update
            record.cancelEdit();
            Ext.callback(callback, scope || me, [ record, null ]);
            return;
        }

        errors = record.validate();
        if (!errors.isValid()) {
            record.cancelEdit();
            Ext.callback(callback, scope || me, [ record, errors ]);
            return;
        }
        record.endEdit();

        if (record.phantom) {
            // Add the record if not already in our task database.
            store.add(record);
        }

        store.sync({
            callback: function(batch) {
                if (batch.hasException()) {
                    // read errors from the current operation
                    errors = batch.operations[batch.current].getError();
                    record = null;
                } else {
                    errors = null;
                }

                Ext.callback(callback, scope || me, [ record, errors ]);
            }
        });
    },

    /**
     * @private
     * Deletes a task *record* from the tasks store.
     */
    _delete: function(record, callback, scope) {
        var store = Ext.getStore('Tasks'),
            errors = null,
            me = this;

        store.remove(record);
        store.sync({
            callback: function(batch) {
                if (batch.hasException()) {
                    // read errors from the current operation
                    errors = batch.operations[batch.current].getError();
                    record = null;
                } else {
                    errors = null;
                }

                Ext.callback(callback, scope || me, [ errors ]);
            }
        });
    },

    /**
     * @private
     */
    _finalize: function(result, errors) {
        var promise = this._promise;
        if (!promise) {
            if (errors) {
                console.error(errors);
            }
        } else {
            this._promise = null;
            if (errors) {
                promise.reject(errors);
            } else {
                promise.fulfill(result);
            }
        }
    },

    /**
     * @private
     * Displays the task editor for the given *task*.
     */
    _showEditor: function(record) {
        var main = this.getMain(),
            view = main.child('taskedit');

        view.setRecord(record);
        main.display(view);
    },

    /**
     * @private
     * Calls when the user requests to creates a new task.
     */
    _onTaskCreate: function(form) {
        var me = this;
        me._save(
            Ext.create('Todo.model.Task', { created: new Date() }),
            form.getValues(),
            function(record, errors) {
                if (errors) {
                    console.log(errors);
                } else {
                    me._refresh();
                    form.reset();
                }
            }
        );
    },

    /**
     * @private
     * Called when the user select a task to edit.
     */
    _onTaskModify: function(record) {
        this._showEditor(record);
    },

    /**
     * @private
     * Changes the *completed* state of the given task *record*.
     */
    _onTaskToggle: function(record, completed) {
        var me = this;
        me._save(
            record,
            { completed: completed },
            function(record, errors) {
                if (errors) {
                    me._finalize(null, errors);
                } else {
                    me._finalize({ toggle: true });
                    me._refresh();
                }
            }
        );
    },

    /**
     * @private
     * Called when the user save modifications done in the task editor. The
     * associated record will be added or updated (depending if it already
     * exists in the task list).
     */
    _onTaskCommit: function(form) {
        var store = Ext.getStore('Tasks'),
            record = form.getRecord(),
            values = form.getValues(),
            phantom = record.phantom,
            promise = this.promise,
            me = this;

        me._save(record, values, function(record, errors) {
            if (errors) {
                me._finalize(null, errors);
            } else {
                me._finalize({ updated: true });
                me.getMain().display('tasklist');
                me._refresh();
                form.reset();
            }
        });

        // form.updateRecord();
        // store.sync({
        //     // callback: function(batch) {
        //     //     if (batch.hasException()) {
        //     //         // read errors from the current operation
        //     //         errors = batch.operations[batch.current].getError();
        //     //         record = null;
        //     //     } else {
        //     //         errors = null;
        //     //     }

        //     //     //Ext.callback(callback, scope || me, [ record, errors ]);
        //     // }
        // });

    },

    /**
     * @private
     */
    _onTaskDelete: function(record) {
        var me = this;
        me._delete(record, function(errors) {
            if (errors) {
                console.log(errors);
            } else {
                me.getMain().display('tasklist');
            }
        });
    },

    /**
     * @private
     */
    _onTaskCancel: function() {
        this._finalize({ updated: false });
        this.getMain().display('tasklist');
    },

    /**
     * @private
     */
    _refresh: function() {
        var store = Ext.getStore('Tasks');
        if (store.getRemoteSort() ||
            store.getRemoteFilter()) {
            store.load();
        }
    },

    /**
     * @private
     * Handles invoke requests. To keep things simple for this example,
     * rejecting any incoming requests if there is a pending promise.
     */
    _message: function(sender, message) {
        var promise = new Ext.Promise();
        if (this._promise) {
            promise.reject('an action is already in progress');
        } else {
            switch (message.action) {
            case 'create':
                if (!message.todo) {
                    promise.reject('missing task "todo" value');
                } else {
                    this._promise = promise;
                    this._showEditor(
                        Ext.create('App.model.Task', {
                            title: message.todo,
                            created: new Date()
                        })
                    );
                }
            break;
            default:
                promise.reject('invalid or unknown action');
            }
        }
        return promise;
    }
});
