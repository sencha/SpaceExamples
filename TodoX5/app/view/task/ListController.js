/**
 * This class is the main view for the application. It is specified in app.js as the
 * "autoCreateViewport" property. That setting automatically applies the "viewport"
 * plugin to promote that instance of this class to the body element.
 *
 * TODO - Replace this content of this view to suite the needs of your application.
 */
Ext.define('Todo.view.task.ListController', {
    extend: 'Ext.app.ViewController',

    requires: [
        'Ext.MessageBox'
    ],

    alias: 'controller.tasklist',

    control: {
        'dataview': {
            itemclick  : '_onItemTap',
            itemswipe  : '_onItemSwipe'
        },
        'button[action=create]': {
            tap: '_create'
        },
        'textfield': {
            action : '_onFieldAction'
        }
    },

    /**
     * @event taskcreate
     * Fired when a task creation is requested.
     * @param {Ext.form.Panel} form Form from which extract task data.
     */

    /**
     * @event taskmodify
     * Fired when a task modification is requested.
     * @param {App.model.Task} record Task to modify associate record.
     */

    /**
     * @private
     */
    _create: function() {
        var form = this.lookupReference('quickEntryForm');

        // fireViewEvent will fire this event on the view for this controller (Todo.view.task.List)
        // the Todo.controller.Task controller is listening for this event
        this.fireViewEvent('taskcreate', form);
    },


    /**
     * @private
     */
    _onItemTap: function(list, record, item, idx) {
        this.fireViewEvent('taskmodify', record);
    },

    /**
     * @private
     * TODO - rewrite to work with ExtJS 5
     */
    _onItemSwipe: function(list, index, target, record, e) {
        this.fireViewEvent('tasktoggle', record, e.direction === 'right');
    },

    /**
     * @private
     * TODO - replace with a special key listener for the ENTER key
     */
    _onFieldAction: function(field) {
        if (Ext.isEmpty(field.getValue())) {
            // keep focus if field empty
            return false;
        } else {
            this._create();
        }
    }

});
