Ext.define('FileBrowser.store.FileStore', {
	extend: 'Ext.data.Store',
	requires: [
		'FileBrowser.model.FileModel'
	],
	config: {
		storeId: 'Files',
		model: 'FileBrowser.model.FileModel',
		sorters:[{
			property: 'id',
			direction: 'ASC'
		}],
		data: [
			{
				id: '10', // ID becomes file name
				name: '2013 Audit Results',
				url: 'resources/data/2013AuditResults.html',
				previewUrl: 'resources/images/Preview_Placeholder.gif',
				status: 'remote',
				age: 'Recent',
				dataType: 'html'
			},
			{
				id: '11',
				name: 'Marketing Report',
				url: 'resources/data/MarketingReport.html',
				previewUrl: 'resources/images/Preview_Placeholder.gif',
				status: 'remote',
				age: 'Recent',
				dataType: 'html'
			},
			{
				id: '12',
				name: 'HR Review',
				url: 'resources/data/HRReview.html',
				previewUrl: 'resources/images/Preview_Placeholder.gif',
				status: 'remote',
				age: 'Week Old',
				dataType: 'html'
			},
			{
				id: '14',
				name: 'Company Social Picture (limbo)',
				url: 'resources/data/Limbo.b64',
				previewUrl: 'resources/images/Preview_Placeholder.gif',
				status: 'remote',
				age: 'Week Old',
				dataType: 'image'
			}
		],
		grouper: {
			groupFn: function(record) {
				return record.get('age');
			}
		}
	}
});