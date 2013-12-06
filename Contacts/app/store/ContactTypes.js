/*
 * File: app/store/ContactTypes.js
 *
 * This store is filtered by parentId whenever an individual contact form is shown
 */

Ext.define('Contacts.store.ContactTypes', {
        extend: 'Ext.data.Store',

        requires: [
            'Contacts.model.ContactType',
            'Contacts.data.proxy.Sql',
            'Contacts.data.proxy.SecureSql'
        ],

        config: {
            model: 'Contacts.model.ContactType',
            storeId: 'ContactTypes',
            proxy:({
                type: Ext.isSpace ? 'securesql' : 'sql',
                table: 'ContactTypes'
            })
        }
    }
);