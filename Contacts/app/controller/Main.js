/*
 * File: app/controller/Main.js
 *
 * Main Controller
 */

Ext.define('Contacts.controller.Main', {
    extend: 'Ext.app.Controller',

    requires: [
        "Ext.MessageBox"
    ],

    config: {
        views: [
            'ContactsList',
            'ContactView'
        ],

        routes: {
            'contact/:id': 'showContactById'
        },

        control: {
            // Contacts List
            "contactslist button#refresh": {
                tap: 'onRefreshContacts'
            },
            "viewport #contactsList": {
                itemtap: 'onContactListItemTap',
                selectionchange: 'updatePageTitle'
            },
            "textfield#filterContacts": {
                keyup: 'onFilterContacts',
                clearicontap: 'onClearContactsFilters'
            },

            // Contact View
            "contactview button#back": {
                tap: 'onContactViewBackButton'
            },
            "contactview dataview#contactTypes": {
                itemtap: 'onContactTypeTap'
            },

            // Generic
            "component": {
                titlechange: 'updatePageTitle'
            }
        }
    },

    init: function() {
        var controller = this,
            contactsStore = Ext.getStore('Contacts');

        // Special buffered function for filtering list on keyUp
        controller.filterContactsBuffered = Ext.Function.createBuffered(
            function() {
                var textFiled = Ext.ComponentQuery.query('textfield#filterContacts')[0],
                    text = textFiled.getValue(),
                    store = Ext.getStore('Contacts');

                store.clearFilter();

                if (text.trim() !== '') {
                    store.filter('displayName', text, true);
                }
                store.load();
            },
            200, // buffer in MS
            controller // scope
        );
    },

    onRefreshContacts: function() {
        var controller = this,
            stores = [Ext.getStore('Contacts'), Ext.getStore('ContactTypes')],
            contactView = Ext.ComponentQuery.query('#contactView')[0],
            addDataFunc, firstStoreDone = false;

        // Drop selection on list
        Ext.ComponentQuery.query('#contactsList')[0].deselectAll();

        // Need this since we're dropping 2 tables first before 
        // Re-creating them and they have separate async callback, 
        // but we only need to execute function once, when both done
        addDataFunc = function() {
            if (!firstStoreDone) {
                firstStoreDone = true;
                return;
            }
            controller.addTestData(false);
        };

        // Drop WebSQL tables and recreate them (by reloading)
        Ext.Array.each(stores, function(store) {
            store.getProxy().dropTable();
            store.getProxy().setTableExists(false);
            store.on({
                load: {
                    single: true,
                    fn: addDataFunc
                }
            });
            store.load();
        });

        // Clean up the view
        contactView.hideItems();
        contactView.cover();
    },

    // This function will load data from MockData.json and jam it into the WebSQL stores.
    // If isLarge param is true, multiple copies of each of the mock records
    // will be created with according numbering on the displayName.
    // It's worth noting we're loading the same file twice since it has both Contacts
    // and ContactTypes data. Decided not to use model associations due to questionable
    // SQL proxy support
    addTestData: function(isLarge) {
        var viewport = Ext.ComponentQuery.query('viewport')[0];

        // Mask contacts list
        viewport.setMasked({ xtype: 'loadmask', indicator: true, message: 'Loading Test Data ...'});

        // Load "MockData.json" and populate Contacts WebSQL from it
        Ext.create('Ext.data.Store', {
            model: "Contacts.model.Contact",
            proxy: {
                type: "ajax",
                url : "MockData.json",
                reader: {
                    type: "json",
                    rootProperty: 'contacts'
                }
            },
            autoLoad: true,
            listeners: {
                load: function(mockDataStore) {
                    var sqlDataStore = Ext.getStore('Contacts'),
                        i = 0;
                    mockDataStore.each(function(item) {
                        var copy;
                        if (!sqlDataStore.getById(item.get('id'))) { // does not exist
                            item.phantom = true; // mark as "new" so 2nd store can sync it
                            sqlDataStore.add(item);

                            if (isLarge) {
                                for (i = 0; i < 20; i++) {
                                    copy = item.copy();
                                    copy.set('displayName', copy.get('displayName') + ' ' + i);
                                    copy.phantom = true;
                                    sqlDataStore.add(copy);
                                }
                            }

                        }
                    });
                    sqlDataStore.sync(); // Write to WebSQL
                    sqlDataStore.addListener({ load: { // for unmasking
                        single: true,
                        fn: function() {
                            viewport.setMasked(false);
                        }
                    }});
                    sqlDataStore.load(); // Otherwise sorting on list is messed up
                    // mockDataStore.destroy(); - destroying it causes can cause issues with the sql store
                }
            }
        });

        // Load "MockData.json" and populate ContactTypes WebSQL from it
        Ext.create('Ext.data.Store', {
            model: "Contacts.model.ContactType",
            proxy: {
                type: "ajax",
                url : "MockData.json",
                reader: {
                    type: "json",
                    rootProperty: 'contactTypes'
                }
            },
            autoLoad: true,
            listeners: {
                load: function(mockDataStore) {
                    var sqlDataStore = Ext.getStore('ContactTypes');
                    mockDataStore.each(function(item) {
                        if (!sqlDataStore.getById(item.get('id'))) { // does not exist
                            item.phantom = true; // mark as "new" so 2nd store can sync it
                            sqlDataStore.add(item);
                        }
                    });
                    sqlDataStore.sync(); // Write to WebSQL
                    // mockDataStore.destroy(); - destroying it causes can cause issues with the sql store
                }
            }
        });
    },

    onContactListItemTap: function(dataview, index, target, record, e, eOpts) {
        var controller = this;
        this.redirectTo('contact/' + record.get('id'));
    },

    // Does not modify the contacts list; only the view on the right
    selectContact: function(record) {
        var contactView = Ext.ComponentQuery.query('#contactView')[0],
            contactsList = Ext.ComponentQuery.query('#contactsList')[0],
            currentSelection = contactsList.getSelection();

        contactView.setRecord(record); // Popuplate "Contact" view
        contactView.uncover();

        // Flip to the "Contact" view
        Ext.ComponentQuery.query('#mainCardPanel')[0].setActiveItem(contactView);

        // Deep linking support
        contactView.fireEvent('titlechange');
    },

    onFilterContacts: function(textfield, e, eOpts) {
        var controller = this;
        controller.filterContactsBuffered(); // set up in init()
    },

    onClearContactsFilters: function(textfield, e, eOpts) {
        var controller = this;
        controller.filterContactsBuffered(); // set up in init()
    },

    onContactViewBackButton: function(button) {
        var mainCardPanel = Ext.ComponentQuery.query('#mainCardPanel')[0],
            contactView = button.up('contactview'),
            contactsList = Ext.ComponentQuery.query('#contactsList')[0];
        mainCardPanel.animateActiveItem(contactsList, {type:'slide', direction:'right'});
        contactView.cover();

        // Deep linking support
        window.history.pushState(null, null, '#');
        contactView.fireEvent('titlechange');
    },

    // When route #contact/123 is navigated in URL
    showContactById: function(id) {
        var controller = this,
            contactsList = Ext.ComponentQuery.query('#contactsList')[0],
            contactsStore = Ext.getStore('Contacts'),
            record,
            findAndSelectFunc;

        // This function will be executed immediately if Contacts store is not actively loading;
        // otherwise it will execute once after store is loaded
        findAndSelectFunc = function() {
            record = contactsStore.getById(id);
            if (!record) { return; }
            contactsList.select(record);
            controller.selectContact(record);
        };

        if (contactsStore.loading) {
            contactsStore.on({
                load: {
                    single: true,
                    fn: findAndSelectFunc
                }
            });
        }
        else {
            findAndSelectFunc();
        }
    },

    // Whenever "Chat" contact type is tapped, we will Invoke
    // the chat app for a specific user
    onContactTypeTap: function(dataview, index, target, record, e, eOpts) {
        var invoke,
            broadcast;

        // We only care for chat
        if (!record || record.get('type').toUpperCase().indexOf('CHAT') === -1) {
            return;
        }

        // Only available in Sencha Space
        if (!Ext.isSpace) {
            Ext.Msg.alert('Not Supported', 'This functionality is only ' +
                'available in Sencha Space! www.Sencha.com');
            return;
        }

        // Invoke chat
        var failure = function(error) {
            Ext.Msg.alert('Chat Invoke Error', (error.message || error));
        };
        var send = function(connection) {
            connection.send({type: 'chat', user: 'jason.cline@sencha.com'}, true);
        };
        Ext.space.Invoke.get('chat').then(send, failure);
    },

    updatePageTitle: function() {
        var selection = Ext.ComponentQuery.query('#contactsList')[0].getSelection(),
            mainCardPanel = Ext.ComponentQuery.query('#mainCardPanel')[0],
            contactView = Ext.ComponentQuery.query('#contactView')[0];
        if (!document.originalTitle) {
            document.originalTitle = document.title;
        }
        // Reset to original title if there's no selection or no contact being viewed currently
        if (selection.length === 0 || (
                Contacts.profile.Phone.active &&
                mainCardPanel.getActiveItem() !== contactView
            )) {
            document.title = document.originalTitle;
        }
        else {
            document.title = selection[0].get('displayName');
        }
    }

});