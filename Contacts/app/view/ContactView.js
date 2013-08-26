/*
 * File: app/view/ContactView.js
 *
 * This is the read-only view for a single contact.
 */

Ext.define('Contacts.view.ContactView', {
    extend: 'Ext.Container',
    alias: 'widget.contactview',

    requires: [
        'Ext.Button',
        'Ext.Toolbar',
        'Ext.Label'
    ],

    config: {
        cls: 'view-card',
        scrollable: true,
        items: [
            {
                xtype: 'toolbar',
                title: 'Info',
                docked: 'top',
                height: 55,
                items: [
                    {
                        xtype: 'button',
                        itemId: 'back',
                        cls: 'dark',
                        text: 'Back'
                    },
                    {
                        xtype: 'spacer',
                        flex: 1
                    },
                    {
                        xtype: 'label',
                        cls: 'version',
                        html: Contacts.versionString
                    }
                ] // eo items
            }, // eo toolbar
            {
                xtype: 'container',
                itemId: 'tplContainer',
                styleHtmlContent: true,
                tpl: '<img class="mug" src="{img}"/>' +
                     '<div class="display-name">{displayName}</div>' +
                     '<div class="title">{title}</div>' +
                     '<div class="notes">{notes}</div>'
            },
            {
                xtype: 'dataview',
                itemId: 'contactTypes',
                store: 'ContactTypes',
                loadingText: false,
                masked: false,
                cls: 'contact-types',
                hidden: true,
                scrollable: null, // autogrow
                itemTpl: new Ext.XTemplate(
                    "<tpl if='this.isShowCallButton(type)'>" +
                        '<a class="call" href="tel://{typeData}">' +
                    "</tpl>" +
                    "<tpl if='this.isShowEmailButton(type)'>" +
                        '<a class="email" href="mailto:{typeData}">' +
                    "</tpl>" +
                    "<tpl if='this.isShowChatButton(type)'>" +
                        '<a class="chat">' +
                    "</tpl>" +
                        '<span class="type">{type}</span>' +
                        '<span class="type-data">{typeData}</span>' +
                    "</a>",
                    {
                        isShowCallButton: function(type) {
                            if (type && type.toUpperCase().indexOf('PHONE') !== -1) {
                                return true;
                            }
                            return false;
                        },

                        isShowEmailButton: function(type) {
                            if (type && type.toUpperCase().indexOf('EMAIL') !== -1) {
                                return true;
                            }
                            return false;
                        },

                        isShowChatButton: function(type) {
                            if (type && type.toUpperCase().indexOf('CHAT') !== -1) {
                                return true;
                            }
                            return false;
                        }

                    }) // eo new Ext.XTemplate()
            }
        ] // eo items
    },

    // Applies mask to the view and disables all the buttons in the toolbar;
    // used for tablet layout purposes
    cover: function() {
        var me = this,
            toolbarButtons = me.down('toolbar').query('button');
        me.setMasked({ xtype: 'loadmask', indicator: false, message: 'Please Select a Contact'});
        Ext.Array.each(toolbarButtons, function(button) {
            button.disable();
        });
    },

    // Opposite of cover(), this unmasks the form and enables
    // all the buttons in the toolbar; used for tablet purposes
    uncover: function() {
        var me = this,
            toolbarButtons = me.down('toolbar').query('button');
        me.setMasked(false);
        Ext.Array.each(toolbarButtons, function(button) {
            button.enable();
        });
    },

    // Clears the visible area
    hideItems: function() {
        var me = this;
        me.down('#contactTypes').hide();
        me.down('#tplContainer').hide();
    },

    // Shows visible area
    showItems: function() {
        var me = this;
        me.down('#contactTypes').show();
        me.down('#tplContainer').show();
    },

    // This function will query WebSQL and add ContactTypes data to the view, for the specified record;
    // callback parameter will be executed when the ContactTypes store finishes loading after setting its filter for the new Contact
    setRecord: function(record, callback) {
        if (!record) { // called with null record when removing record from store & syncing store
            this.callParent(arguments);
            return;
        }

        var me = this,
            contactTypesStore = Ext.getStore('ContactTypes'),
            tplContainer = me.down('#tplContainer');

        me.showItems();

        // Prepare ContactTypes store callback, if needed
        if (callback) {
            contactTypesStore.addListener({ load: {
                single: true,
                fn: callback
            }});
        }

        // Search ContactTypes store by parentId
        contactTypesStore.clearFilter();
        contactTypesStore.filter('parentId', record.get('id'), false);
        contactTypesStore.load();

        me.callParent(arguments);
        tplContainer.setRecord(record);
    }

});