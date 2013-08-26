Ext.define('FileBrowser.view.HtmlViewer', {
	extend: 'Ext.Container',
	requires: [
		'Ext.Button',
		'Ext.TitleBar'
	],
	xtype: 'htmlviewer',
	config: {
		styleHtmlContent: true,
		scrollable: true,
		items: [{
			xtype: 'titlebar',
			docked: 'top',
			items: [{
				xtype: 'button',
				align: 'right',
				text: 'Back',
				itemId: 'back'
			}]
		}]
	}
});