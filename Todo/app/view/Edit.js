/**
 * @class App.view.Edit
 * @author Simon Brunel
 */
Ext.define('App.view.Edit', {
    extend: 'Ext.Container',
    xtype: 'taskedit',

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

    requires: [
        'Ext.TitleBar',
        'Ext.form.Panel',
        'Ext.field.Toggle',
        'Ext.form.FieldSet'
    ],

    config: {
        /**
         * @cfg {App.model.Task} record
         * The task record to edit.
         */
        record: null,

        layout: { type: 'vbox', align: 'stretch' },
        items: [
            {   xtype: 'titlebar',
                items: [
                    {   text: 'Cancel',
                        align: 'left',
                        action: 'cancel'
                    },
                    {   align: 'right',
                        action: 'delete',
                        iconCls: 'delete',
                        ui: 'decline'
                    },
                    {   text: 'Save',
                        align: 'right',
                        action: 'commit',
                        ui: 'confirm'
                    }
                ]
            },
            {   xtype: 'formpanel',
                flex: 1,
                items: [
                    {   xtype: 'fieldset',
                        items: [
                            {   xtype: 'textfield',
                                name: 'title',
                                required: true,
                                placeHolder: 'Title'
                            },
                            {   xtype: 'textareafield',
                                name: 'description',
                                placeHolder: 'Description'
                            },
                            {   xtype: 'togglefield',
                                name: 'completed',
                                label: 'Completed'
                            }
                        ]
                    }
                ]
            }
        ],

        control: {
            'button[action=cancel]': {
                tap: '_cancel'
            },
            'button[action=commit]': {
                tap: '_commit'
            },
            'button[action=delete]': {
                tap: '_delete'
            }
        }
    },

    /**
     * @protected
     */
    setRecord: function(record) {
        this.down('formpanel').setRecord(record);
        this.down('[action=delete]').setHidden(record.phantom);
    },

    /**
     * @private
     */
    _commit: function() {
        this.fireEvent('taskcommit', this.down('formpanel'));
    },

    /**
     * @private
     */
    _cancel: function() {
        this.fireEvent('taskcancel');
    },

    /**
     * @private
     */
    _delete: function() {
        this.fireEvent('taskdelete', this.down('formpanel').getRecord());
    }
});
