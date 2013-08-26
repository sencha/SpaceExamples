/*
 * File: app/model/Contact.js
 *
 */

Ext.define('Contacts.model.Contact', {
    extend: 'Ext.data.Model',

    config: {
        identifier: {
            type: 'uuid'
        },
        fields: [
            {
                name: 'id'
            },
            {
                name: 'firstName',
                type: 'string'
            },
            {
                name: 'lastName',
                type: 'string'
            },
            {
                name: 'middleName',
                type: 'string'
            },
            {
                name: 'displayName',
                type: 'string'
            },
            {
                name: 'notes',
                type: 'string'
            },
            {
                name: 'title',
                type: 'string'
            },
            {
                name: 'img',
                type: 'string'
            }
        ]
    }
});