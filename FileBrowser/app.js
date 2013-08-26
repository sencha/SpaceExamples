// DO NOT DELETE - this directive is required for Sencha Cmd packages to work.
//@require @packageOverrides

//<debug>
Ext.Loader.setPath({
	'Ext': 'touch/src',
	'FileBrowser': 'app'
});
//</debug>

// Globals
Ext.ns('FileBrowser.globals');
FileBrowser.globals.FILESYSTEM_DIR_NAME = "sencha_secudocs";

Ext.application({
	name: 'FileBrowser',

	controllers: [
		'Main'
	],

	views: [
		'FileList',
		'ImageViewer',
		'HtmlViewer'
	],

	stores: [
		'FileStore'
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

	viewport: {
		itemId: 'mainCardPanel',
		layout: {
			type: 'card',
			animation: 'pop'
		}
	},

	launch: function() {
		var app = this;

		// Layout
		Ext.Viewport.add([
			{
				xtype: 'filelist',
				store: 'Files'
			},
			{
				xtype: 'imageviewer'
			},
			{
				xtype: 'htmlviewer'
			}
		]);

		// Scan filesystem for already downloaded files
		app.getController('Main').onAppLaunch();

		// Destroy the #appLoadingIndicator element
		Ext.fly('appLoadingIndicator').destroy();
	},

	onUpdated: function() {
		// Used by production microloader which we dont' use
	}
});
