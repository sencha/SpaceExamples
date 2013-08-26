/*
 * File: app/model/ContactType.js
 *
 * i.e. Email ("type") is "bob@blah.com" ("typeData")
 */

Ext.define('Contacts.model.ContactType', {
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
                name: 'parentId'
            },
            {
                name: 'type'
            },
            {
                name: 'typeData'
            }
        ]
    }
});