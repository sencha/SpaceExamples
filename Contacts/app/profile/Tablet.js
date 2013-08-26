Ext.define('Contacts.profile.Tablet', {
	extend: 'Ext.app.Profile',
	statics: {
		active: false
	},
	config: {
		name: 'Tablet',
		views: ['Main']
	},

	isActive: function() {
		return Ext.os.is.Tablet || Ext.os.deviceType == 'Desktop';
	},

    launch: function() {
    	var profile = this,
    		contactView;

        Contacts.profile.Tablet.active = true;
        Ext.create('Contacts.view.tablet.Main', {fullscreen: true});
        contactView = Ext.ComponentQuery.query('#contactView')[0];
        contactView.cover();
        contactView.down('button#back').hide();

        // Support for "back" browser button and going to home page
        profile.getApplication().getHistory().on('change', function() {
            if (!String(window.location.hash).substr(1)) {
                profile.showHome();
            }
        }, profile);
    },

    showHome: function() {
    	var contactView = Ext.ComponentQuery.query('#contactView')[0];
    	contactView.hideItems();
        contactView.cover();
        Ext.ComponentQuery.query('#contactsList')[0].deselectAll();
    }
});