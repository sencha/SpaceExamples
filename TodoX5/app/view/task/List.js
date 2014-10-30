/**
 * @class Todo.view.task.List
 */
Ext.define('Todo.view.task.List', {
    extend: 'Ext.container.Container',
    xtype: 'tasklist',

    requires: [
        'Todo.view.task.ListController',
        'Todo.view.task.ListModel',
        'Ext.form.Panel',
        'Ext.view.View',
        'Ext.grid.Panel',
        'Ext.grid.plugin.RowEditing'
    ],

    controller: 'tasklist',
    viewModel: {
        type: 'tasklist'
    },

    baseCls: 'tasklist',

    layout: { 
        type: 'vbox',  
        align: 'stretch' 
    },

    items: [
        {   
            xtype       : 'form',
            reference   : 'quickEntryForm',
            scrollable  : null,
            items: [
                {   
                    xtype   : 'toolbar',
                    layout  : {
                        type: 'hbox',
                        align: 'stretch'
                    },
                    items: [
                        {   
                            xtype       : 'textfield',
                            name        : 'title',
                            emptyText   : 'New Task',
                            allowBlank  : false,
                            msgTarget   : 'none',
                            flex        : 1
                        },
                        {   
                            xtype       : 'button',
                            scale       : 'large',
                            action      : 'create',
                            glyph       : 'xf067@FontAwesome',
                            formBind    : 'true',
                            handler     : '_create'
                        }
                    ]
                }
            ]
        },
        {   
            xtype       : 'gridpanel',
            //title       : 'Tasks',
            rowLines    : true,
            columnLines : true,
            flex        : 1,
            hideHeaders : true,
            itemId      : 'list',
            loadingText : false,
            store       : 'Tasks',

            viewConfig: {
                stripeRows  : false,
                emptyText   : 'No Tasks'
            },

            columns: [
                {
                    flex        : 1,
                    xtype       : 'templatecolumn',
                    dataIndex   : 'title',
                    tpl         : [
                        '<div class="<tpl if=\"completed\">task-done</tpl>">',
                            '<div>{title}</div>',
                        '</div>'
                    ].join('')
                }
            ]
            
        }
    ]
});
