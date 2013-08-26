// DO NOT DELETE - this directive is required for Sencha Cmd packages to work.
//@require @packageOverrides

//<debug>
Ext.Loader.setPath({
    'Ext': 'touch/src',
    'Contacts': 'app'
});
//Ext.Loader.setConfig({
//    disableCaching: false
//});
//</debug>

Ext.application({
    name: 'Contacts',

    profiles: [
        'Phone',
        'Tablet'
    ],

    models: [
        'Contact',
        'ContactType'
    ],

    stores: [
        'Contacts',
        'ContactTypes',
        'ContactTypesDropdownValues'
    ],

    controllers: [
        'Main'
    ],

    icon: {
        '57': 'resources/icons/Icon.png',
        '72': 'resources/icons/Icon~ipad.png',
        '114': 'resources/icons/Icon@2x.png',
        '144': 'resources/icons/Icon~ipad@2x.png'
    },

    isIconPrecomposed: true,

    startupImage: {
        '320x460': 'resources/startup/320x460.jpg',
        '640x920': 'resources/startup/640x920.png',
        '768x1004': 'resources/startup/768x1004.png',
        '748x1024': 'resources/startup/748x1024.png',
        '1536x2008': 'resources/startup/1536x2008.png',
        '1496x2048': 'resources/startup/1496x2048.png'
    },

    launch: function() {
        var application = this,
            contactsStore = Ext.getStore('Contacts');

        // Destroy the #appLoadingIndicator element
        Ext.fly('appLoadingIndicator').destroy();

        // Auto-populate contacts with test data on startup, if the store is empty
        contactsStore.on({
            load: {
                single: true,
                fn: function() {
                    if (contactsStore.getCount() === 0) {
                        application.getController('Main').addTestData(false);
                    }
                }
            }
        });

        // Only available in Sencha Space
        setTimeout(function() {
            if (!Ext.isSpace) {
                Ext.Msg.alert('Not Secure', 'This app requires Sencha Space for encryption! www.Sencha.com');
                return;
            }
        }, 1000);
    }, // eo launch()

    onUpdated: function() {
        // Left over method from supporting Touch 2.2 "Production" microloader
    }
});
