/**
 * @class Todo.view.task.Edit
 */
Ext.define('Todo.view.task.Edit', {
    //extend: 'Ext.container.Container',
    extend: 'Ext.form.Panel',
    xtype: 'taskedit',

    requires: [
        'Todo.view.task.EditController',
        'Todo.view.task.EditModel',
        'Ext.form.Panel',
        'Ext.form.FieldSet'
    ],

    controller: 'taskedit',
    viewModel: {
        type: 'taskedit'
    },

    /**
     * @cfg {App.model.Task} record
     * The task record to edit.
     */
    record: null,

    bodyPadding: 10,

    defaults: {
        anchor: '100%'
    },

    items   : [
        {   
            xtype       : 'textfield',
            name        : 'title',
            required    : true,
            anchor      : '100%',
            emptyText   : 'Title'
        },
        {   
            xtype       : 'textareafield',
            name        : 'description',
            emptyText   : 'Description'
        },
        {   
            xtype           : 'checkbox',
            name            : 'completed',
            fieldLabel      : 'Completed',
            anchor          : null,
            width           : 200,
            uncheckedValue  : false,
            ui              : 'toggle'
        }
    ],

    dockedItems: [
        {   
            xtype   : 'toolbar',
            dock    : 'top',
            defaults: {
                scale: 'medium'
            },
            items: [
                {   
                    text    : 'Cancel',
                    action  : 'cancel'
                },
                '->',
                {   
                    action  : 'delete',
                    glyph   : 'xf014@FontAwesome'
                },
                {   
                    text    : 'Save',
                    action  : 'commit'
                }
            ]
        }
    ],

    /**
     * @protected
     */
    setRecord: function(record) {
        this.loadRecord(record);
        this.down('[action=delete]').setHidden(record.phantom);
    }

});
