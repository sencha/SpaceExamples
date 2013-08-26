// This main view is used for desktop/tablet and it's hbox of
// ContactsList and ContactForm side by side.

Ext.define('Contacts.view.tablet.Main', {
    extend: 'Ext.Panel',

    config: {
        layout: {
            type: 'hbox',
            align: 'stretch',
            pack: 'center'
        },
        items: [
            {
                xtype: 'contactslist',
                itemId: 'contactsList',
                store: 'Contacts',
                width: '40%'
            },
            {
                xtype: 'container',
                itemId: 'mainCardPanel', // Left over from having a form; didn't want to refactor
                flex: 1,
                layout: {
                    animation: 'flip',
                    type: 'card'
                },
                items: [
                    {
                        xtype: 'contactview',
                        itemId: 'contactView'
                    }
                ]
            }
        ]
    }

});