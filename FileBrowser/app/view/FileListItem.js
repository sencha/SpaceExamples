// This is one of the file entries in the Files list

Ext.define('FileBrowser.view.FileListItem', {
	extend: 'Ext.dataview.component.ListItem',
	xtype: 'filelistitem',
	requires: [
		'Ext.Img',
		'Ext.Label',
		'Ext.Button'
	],
	config: {
		layout: { type: 'hbox' },
		items: [
			{
				xtype: 'image',
				itemId: 'preview',
				width: 50,
				height: 50
			},
			{
				xtype: 'label',
				itemId: 'name',
				flex: 1
			},
			{
				xtype: 'button',
				itemId: 'action'
			}
		]
	},

	// Gets called whenever we need to put a record into this data item (i.e. when list is shown)
	updateRecord: function(record) {
		if (!record) {
			return;
		}

		var me = this;
		me.down('image#preview').setSrc(record.get('previewUrl'));
		me.down('label#name').setHtml(record.get('name'));
		me.updateButton(record);

		me.callParent(arguments);
	},

	// The action button changes text/style depending on current status of a given file
	updateButton: function(record) {
		var me = this,
			button = me.down('button#action');

		switch(record.get('status')) {
			case 'remote':
				button.setIconCls('download');
				button.setCls('download');
				button.action = 'download';
				break;
			case 'local':
				button.setIconCls('arrow_right');
				button.setCls('view');
				button.action = 'view';
				break;
			case 'downloading':
				button.setIconCls('refresh');
				button.setCls('downloading');
				button.action = 'cancelDownload';
				break;
		}
	}
});
