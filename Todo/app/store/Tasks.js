/**
 * @class App.store.Tasks
 * @author Simon Brunel
 */
Ext.define('App.store.Tasks', {
    extend: 'Ext.data.Store',
    requires: [
        'App.util.data.proxy.SecureSql',
        'Ext.data.proxy.Sql'
    ],

    config: {
        storeId: 'tasks',
        model: 'App.model.Task',
        autoLoad: true,
        autoSync: false,

        proxy: {
            type: 'securesql'
        },

        sorters: [
            {   // sort task by there completed state (grouper)
                property: 'completed'
            },
            {   // sort task by there creation date
                property: 'created',
                direction: 'ASC'
            }
        ],

        grouper: {
            sortProperty: 'completed',
            groupFn: function(record) {
                return (record.get('completed') === true)? 'Done' : 'Todo';
            }
        }
    },

    constructor: function(config) {
        //<debug>
        if (!Ext.isSpace) {
            // fallback if not in Space environment.
            console.warn('debug: this store does NOT use secure SQL');
            config.proxy = { type: 'sql' };
        }
        //</debug>

        this.callParent([config]);
    }
});
