/*
 * File: app/view/ContactsList.js
 *
 * Contacts list shown on the left.
 */

Ext.define('Contacts.view.ContactsList', {
    extend: 'Ext.dataview.List',
    alias: 'widget.contactslist',

    requires: [
        'Ext.Button',
        'Ext.Toolbar',
        'Ext.field.Search',
        'Ext.plugin.ListPaging'
    ],

    config: {
        loadingText: false,
        masked: false,
        deferEmptyText: false,
        variableHeights: true,
        scrollable: {
            direction: 'vertical',
            directionLock: true
        },
        itemTpl: [
            '<div class="mug-wrapper"><img class="mug" src="{img}"/></div>',
            '<span class="text-wrapper">',
            '   <span class="display-name">{displayName}</span>',
            '   <span class="title">{title}</span>',
            '</span>'
        ],
        items: [
            {
                xtype: 'toolbar',
                docked: 'top',
                height: 55,
                items: [
                    {
                        xtype: 'searchfield',
                        flex: 1,
                        itemId: 'filterContacts',
                        placeHolder: 'Search'
                    },
                    {
                        xtype: 'button',
                        itemId: 'refresh',
                        iconCls: 'add'
                    }
                ]
            }
        ]
    }

});