Ext.define('FileBrowser.model.FileModel', {
	extend: 'Ext.data.Model',
	config: {
		fields: [
			'id',
			'name', // the text in the list
			'url', // where we would get the data from
			'previewUrl', // the preview icon in the list
			'status', // local|remote|downloading - reflected on the action button
			'age', // Used for grouping in the list
			'dataType' // image|html|pdf
		]
	}
});