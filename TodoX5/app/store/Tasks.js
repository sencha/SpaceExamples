/**
 * @class Todo.store.Tasks
 */
Ext.define('Todo.store.Tasks', {
    extend: 'Ext.data.Store',
    requires: [
        'Todo.util.data.proxy.SecureSql',
        'Ext.data.proxy.Sql',
        'Todo.model.Task'
    ],

    model: 'Todo.model.Task',

    autoLoad: true,
    autoSync: false,

    // to turn off paging and load the entire dataset into the store set this to 0
    pageSize: 0,

    proxy: {
        type: 'securesql'
    },

    sorters: [
        {   // sort task by their completed state
            property: 'completed'
        },
        {   // sort task by their creation date
            property: 'created',
            direction: 'ASC'
        }
    ],

    constructor: function (config) {
        if (!Ext.isSpace) {
            // fallback if not in Space environment.
            console.warn('debug: this store does NOT use secure SQL');
            config.proxy = { type: 'sql' };
        }

        this.callParent([config]);
    }
});
