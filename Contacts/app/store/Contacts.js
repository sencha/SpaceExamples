// WebSQL-backed store for the main list of contacts

Ext.define('Contacts.store.Contacts',
    {
        extend: 'Ext.data.Store',

        requires: [
            'Contacts.model.Contact',
            'Contacts.data.proxy.Sql',
            'Contacts.data.proxy.SecureSql'
        ],

        config: {
            autoLoad: true,
            model: 'Contacts.model.Contact',
            storeId: 'Contacts',
            pageSize: 1000, // SQL proxy pages even when not infinite list
            proxy: ({
                type: Ext.isSpace ? 'securesql' : 'sql',
                table: 'Contacts'
            }),
            sorters: [{
                property: 'displayName'
            }]
        }
    }
);