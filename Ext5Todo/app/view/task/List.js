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
        'Ext.grid.Panel'
    ],

    controller: 'tasklist',
    viewModel: {
        type: 'tasklist'
    },

    baseCls: 'tasklist',

    layout: 'border',


    initComponent: function () {
        this.items = this.getItemsCfg();
        this.callParent(arguments);
    },

    getItemsCfg: function () {
        return [
            this.getFormCfg(),
            this.getGridCfg()
        ];
    },

    getFormCfg: function () {
        return {   
            xtype       : 'form',
            region      : 'north',
            reference   : 'quickEntryForm',
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
        };
    },

    getGridCfg: function () {
        var gridStore = Ext.getStore('Tasks'),
            pageSize = gridStore.getPageSize();

        return {   
            xtype       : 'gridpanel',
            region      : 'center',
            flex        : 1,
            hideHeaders : true,
            itemId      : 'list',
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
            ],

            // only add pagingtoolbar if pageSize > 0
            dockedItems: [pageSize > 0 ? {
                xtype       : 'pagingtoolbar',
                store       : 'Tasks',
                dock        : 'bottom',
                displayInfo : false
            }: null]
            
        };
    }

});
