Ext.define('FileBrowser.view.ImageViewer', {
	extend: 'Ext.Container',
	requires: [
		'Ext.Button',
		'Ext.TitleBar'
	],
	xtype: 'imageviewer',
	config: {
		layout: {
			type: 'fit'
		},
		items: [
			{
				xtype: 'titlebar',
				docked: 'top',
				items: [
					{
						xtype: 'button',
						align: 'right',
						itemId: 'back',
						text: 'Back'
					}
				]
			}, // eo toolbar
			{
				xtype: 'image',
				itemId: 'data'
			}
		] // eo items
	} // eo config
});