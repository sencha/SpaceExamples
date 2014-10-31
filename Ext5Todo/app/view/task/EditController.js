/**
 * This class is the main view for the application. It is specified in app.js as the
 * "autoCreateViewport" property. That setting automatically applies the "viewport"
 * plugin to promote that instance of this class to the body element.
 *
 * TODO - Replace this content of this view to suite the needs of your application.
 */
Ext.define('Todo.view.task.EditController', {
    extend: 'Ext.app.ViewController',

    requires: [
        'Ext.MessageBox'
    ],

    alias: 'controller.taskedit',

    control: {
        'button[action=cancel]': {
            click: '_cancel'
        },
        'button[action=commit]': {
            click: '_commit'
        },
        'button[action=delete]': {
            click: '_delete'
        }
    },

    /**
     * @event taskcommit
     * Fired when the user requests to commit task values modifications.
     * The associated record should be retrieved using form.getRecord().
     * @param {Ext.form.Panel} form Form containing task record and n values.
     */

    /**
     * @event taskdelete
     * Fired when the user requests to delete the current task.
     * @param {App.model.Task} record Task record to delete.
     */

    /**
     * @event taskcancel
     * Fired when the user requests to cancel task edition.
     */

    /**
     * @private
     */
    _commit: function() {
        this.fireViewEvent('taskcommit', this.getView());
    },

    /**
     * @private
     */
    _cancel: function() {
        this.fireViewEvent('taskcancel');
    },

    /**
     * @private
     */
    _delete: function() {
        this.fireViewEvent('taskdelete', this.getView().getRecord());
    }
});
