/*
 * File: app/store/ContactTypesDropdownValues.js
 *
 */

Ext.define('Contacts.store.ContactTypesDropdownValues', {
    extend: 'Ext.data.Store',

    statics: {
        defaultValue: 'Cell Phone' // used in select fields
    },

    config: {
        data: [
            {
                value: 'Email',
                text: 'Email'
            },
            {
                value: 'Cell Phone',
                text: 'Cell Phone'
            },
            {
                value: 'Home Phone',
                text: 'Home Phone'
            },
            {
                value: 'Work Phone',
                text: 'Work Phone'
            }
        ],
        storeId: 'ContactTypesDropdownValues',
        fields: [
            {
                name: 'value'
            },
            {
                name: 'text'
            }
        ]
    }

});