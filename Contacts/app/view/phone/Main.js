// This main view is used for phone and it's a card layout of
// ContactsList and ContactForm

Ext.define('Contacts.view.phone.Main', {
    extend: 'Ext.Panel',

    config: {
        itemId: 'mainCardPanel',
        layout: {
            animation: 'slide',
            type: 'card'
        },
        items: [
            {
                xtype: 'contactslist',
                itemId: 'contactsList',
                store: 'Contacts',
                cls: 'phone'
            },
            {
                xtype: 'contactview',
                itemId: 'contactView'
            }
        ]
    }

});