Ext.define('Contacts.profile.Phone', {
	extend: 'Ext.app.Profile',
	statics: {
		active: false
	},
	config: {
		name: 'Phone',
		views: ['Main']
	},

	isActive: function() {
		return Ext.os.is.Phone;
	},

    launch: function() {
    	var profile = this;

        Contacts.profile.Phone.active = true;
        Ext.create('Contacts.view.phone.Main', {fullscreen: true});

        // Support for "back" browser button and going to home page
        profile.getApplication().getHistory().on('change', function() {
            if (!String(window.location.hash).substr(1)) {
                profile.showHome();
            }
        }, profile);
    },

    showHome: function() {
        var mainCardPanel = Ext.ComponentQuery.query('#mainCardPanel')[0],
            contactView = Ext.ComponentQuery.query('#contactView')[0],
            contactsList = Ext.ComponentQuery.query('#contactsList')[0];
        mainCardPanel.animateActiveItem(contactsList, {type:'slide', direction:'right'});
        contactView.cover();
        contactsList.deselectAll();
    }
});