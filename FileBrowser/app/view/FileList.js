Ext.define('FileBrowser.view.FileList', {
	extend: 'Ext.dataview.List',
	xtype: 'filelist',
	requires: [
		'FileBrowser.view.FileListItem'
	],
	config: {
		useComponents: true,
		defaultType: 'filelistitem',
		disableSelection: true,
		grouped: true
	}
});
