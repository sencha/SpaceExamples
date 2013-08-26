Ext.define('FileBrowser.controller.Main', {
	extend: 'Ext.app.Controller',
	requires: [
		'Ext.MessageBox',
		'FileBrowser.view.ImageViewer'
	],

	config: {
		control: {
			'filelist button#action[action=view]': {
				tap: 'viewFile'
			},
			'filelist button#action[action=download]': {
				tap: 'downloadFile'
			},
			'imageviewer button#back': {
				tap: 'backToFilesList'
			},
			'htmlviewer button#back': {
				tap: 'backToFilesList'
			}
		}
	},

	// Scan filesystem for already downloaded files and update their status
	onAppLaunch: function() {
		var controller = this,
			failureFunc = function(error) {
				Ext.Msg.alert('Error', error);
			};

		if (!Ext.isSpace || !Ext.space || !Ext.space.FileSystem) {
			Ext.Msg.alert('Error', 'Ext.space.FileSystem is only supported in Sencha Space! www.Sencha.com');
			return;
		}

		// Get our app directory and check every file from the File store for existance,
		// updating its status to "local" whenever found locally
		Ext.space.FileSystem.requestFileSystem({
			success: function(fs) {
				controller.createFolders({
					parentFolder: fs.getRoot(),
					folders: [FileBrowser.globals.FILESYSTEM_DIR_NAME],
					success: function(dir) {
						// We got our app directory; now we loop on each possible file
						// and check for its existence
						var fileStore = Ext.getStore('Files');
						fileStore.each(function(record){
							controller.isFileExist({
								parentFolder: dir,
								fileName: record.get('id'),
								success: function(isExist, file) {
									if (isExist) {
										record.set('status', 'local');
									}
								}, // eo success
								failure: failureFunc
							}); // eo controller.isFileExist({
						}); // eo fileStore.each(function(){
					}, // eo success
					failure: failureFunc
				}); // eo controller.createFolders({
			}, // eo success
			failure: failureFunc
		}); // eo Ext.space.FileSystem.requestFileSystem({
	}, // eo onAppLaunch()

	// Whenever a [Back] button is clicked, i.e. on image viewer
	backToFilesList: function() {
		var mainCardPanel = Ext.ComponentQuery.query('#mainCardPanel')[0],
			fileList = Ext.ComponentQuery.query('filelist')[0];
		mainCardPanel.setActiveItem(fileList);
	},


	// ############### DOWNLOADING A FILE ###############


	// Whenever a [Download] button is clicked
	downloadFile: function(button) {
		var controller = this,
			listItem = button.up('filelistitem'),
			record = listItem.getRecord(),
			url = record.get('url');

		if (!Ext.isSpace || !Ext.space || !Ext.space.FileSystem) {
			Ext.Msg.alert('Error', 'Ext.space.FileSystem is only supported in Sencha Space! www.Sencha.com');
			return;
		}

		// Update button to "downloading" indicator
		record.set('status', 'downloading');
		
		// Download file via AJAX
		Ext.Ajax.request({
			url: url,
			success: function(response){
				var data = response.responseText;
				controller.saveFile(record, data);
			},
			failure: function(response){
				// Update button to [Download]
				record.set('status', 'remote');

				Ext.Msg.alert('Error', response.responseText);
			}
		});
	},

	// Saves file in Space FileSystem, based on record metadata
	// Also updates record's status
	saveFile: function(record, fileData) {
		var controller = this;

		controller.getFile({
			path: FileBrowser.globals.FILESYSTEM_DIR_NAME + '/' + record.get('id'),
			success: function(file) {
				// Write to file
				file.write({
					data: fileData,
					success: function() {
						// Update button to [View]
						record.set('status', 'local');
					}, // eo success
					failure: function(error) {
						// Update button to [Download]
						record.set('status', 'remote');

						Ext.Msg.alert('Error', 'Failed to write to file! ' + error);
					}
				}); // eo write
			},
			failure: function(error) {
				Ext.Msg.alert('Error', error);
			}
		});
	}, // eo saveFile


	// ############### VIEWING A DOWNLOADED FILE ###############


	// Whenever a [View] button is clicked
	viewFile: function(button) {
		var controller = this,
			listItem = button.up('filelistitem'),
			record = listItem.getRecord(),
			dataType = record.get('dataType');

		// Read data from filesystem
		controller.readFile(record, function(fileData) {
			if (dataType === 'image') {
				controller.viewImage(fileData, record);
			}
			else if (dataType === 'html') {
				controller.viewHtml(fileData, record);
			}
			else {
				Ext.Msg.alert('Not Supported', 'Only "image" and "html" are currently supported!');
			}
		});
	},

	// Calls callback passing the data from the file described by record metdata, from Space filesystem
	readFile: function(record, callback) {
		var controller = this;

		controller.getFile({
			path: FileBrowser.globals.FILESYSTEM_DIR_NAME + '/' + record.get('id'),
			success: function(file) {
				// Read from file
				file.read({
					success: function(data) {
						callback.apply(controller, [data]);
					},
					failure: function(error) {
						Ext.Msg.alert('Error', 'Failed to read file! ' + error);
					}
				});
			},
			failure: function(error) {
				Ext.Msg.alert('Error', error);
			}
		}); // eo controller.getFile({
	}, // eo readFile()

	// Viewing images specifically
	viewImage: function(data, record) {
		var mainCardPanel = Ext.ComponentQuery.query('#mainCardPanel')[0],
			imageViewer = Ext.ComponentQuery.query('imageviewer')[0];
		imageViewer.down('image#data').setSrc(data);
		imageViewer.down('titlebar').setTitle(record.get('name'));
		mainCardPanel.setActiveItem(imageViewer);
	},

	// Viewing HTML specifically
	viewHtml: function(data, record) {
		var mainCardPanel = Ext.ComponentQuery.query('#mainCardPanel')[0],
			htmlViewer = mainCardPanel.down('htmlviewer');
		htmlViewer.setHtml(data);
		htmlViewer.down('titlebar').setTitle(record.get('name'));
		mainCardPanel.setActiveItem(htmlViewer);
	},


	// ############### SPACE FILESYSTEM API ABSTRACTION LAYER ###############


	// Auto-creates a file and directory path if it's not there; otherwise it 
	// simply retrieves the file in question (the FS object) and returns it.
	// Sample config:
	// {
	//		path: 'folder/file', // required
	//		success: function(senchaSpaceFSFileObject)..., // optional
	//		failure: function(error)... // optional
	// }
	getFile: function(config) {
		var controller = this,
			split = config.path.split('/'),
			fileName = split[split.length-1],
			folders = split.slice(0, split.length-1);

		// Get FileSystem
		Ext.space.FileSystem.requestFileSystem({
			success: function(fs) {
				// Create folders as necessary
				controller.createFolders({
					parentFolder: fs.getRoot(),
					folders: folders,
					success: function(folder) {
						// Now create/get the file
						folder.readEntries({
							success: function(entries) {
								// Loop on each entry and find one matching file
								var i = 0,
									entry = null;
								for (; i < entries.length; i++) {
									entry = entries[i];
									// We found our file; we're done
									if (entry.path == fileName && !entry.directory) {
										if (config.success) {
											config.success(entry);
										}
										return;
									}
								} // eo for

								// If we got this far it means we didn't find our file and we need to create it
								folder.getFile({
									path: fileName,
									options: {
										create: true,
									},
									success: config.success,
									failure: config.failure ? config.failure : Ext.emptyFn
								}); // eo folder.getFile({
							}, // eo success
							failure: config.failure ? config.failure : Ext.emptyFn
						}); // eo folder.readEntries({
					}, // eo success
					failure: config.failure ? config.failure : Ext.emptyFn
				}); // eo controller.createFolders({
			} // eo success: function(filesystem) {
		}); // eo Ext.space.FileSystem.requestFileSystem({
	}, // eo getFile()

	// Recursively creates the required folders. No issue if any of the folders are already there.
	// Sample config:
	// {
	//		parentFolder: senchaSpaceFSFolderObject, // required
	//		folders: ['f1', 'f2'], // required; will create "f1/f2",
	//		success: function(deepestFolder)..., // optional; deepestFolder is "f2" in this case; this is Space object
	//		failure: function(error)... // optional
	// }
	createFolders: function(config) {
		var controller = this;
		controller.createFolder({
			parentFolder: config.parentFolder,
			newFolderName: config.folders[0], // In this recursion we'll create the first of the folders
			success: function(folder) {
				var remainingFolders = config.folders.slice(1, config.folders.length);
				// If there are any folders remaining to recurse on - do so
				if (remainingFolders.length !== 0) {
					controller.createFolders({
						parentFolder: folder,
						folders: remainingFolders,
						success: config.success,
						failure: config.failure
					});
				}
				// If nothing left to recurse on, we're done
				else {
					if (config.success) {
						config.success(folder);
					}
				}
			},
			failure: config.failure ? config.failure : Ext.emptyFn
		});
	}, // eo createFolders()

	// This function will attempt to create a folder. No issue if folder is already there.
	// Sample config:
	// {
	//		parentFolder: senchaSpaceFSFolderObject, // required
	//		newFolderName: 'new folder', // required
	//		success: function(folderObject)... // optional; folderObject is the created/existing folder
	//		failure: function(error)... // optional;
	// }
	createFolder: function(config) {
		// List folders inside parentFolder, to see if we need to create this one
		config.parentFolder.readEntries({
			failure: config.failure ? config.failure : Ext.emptyFn,
			success: function(entries) {
				var i = 0,
					entry = null,
					entryPathSplit = null,
					entryFileName = null;
				for (; i < entries.length; i++ ){
					entry = entries[i];
					entryPathSplit = entry.path.split('/');
					entryFileName = entryPathSplit[entryPathSplit.length - 1];
					if (entryFileName == config.newFolderName && entry.directory) {
						// Folder exists, we're done
						if (config.success) {
							config.success(entry);
						}
						return;
					}
				} // eo for

				// If we got this far it means we did not find a directory with matching name,
				// so we'll have to create it
				config.parentFolder.getDirectory({
					path: config.newFolderName,
					options: {
						create: true,
						exclusive: true
					},
					success: config.success ? config.success : Ext.emptyFn,
					failure: config.failure ? config.failure : Ext.emptyFn
				});

			} // eo success
		}); // eo parentFolder.readEntries({
	}, // eo createFolder()

	// A simple true/false check for a file's existence.
	// Sample config:
	// {
	//	parentFolder: senchaSpaceFSFolderObject, // required, must (?) exist
	//	fileName: 'myfile', // required
	//	success: function(isExist, senchaSpaceFSFileObject)... // optional
	//	failure: function(error)... // optional
	// }
	isFileExist: function(config) {
		// List files inside our directory
		config.parentFolder.readEntries({
			failure: config.failure ? config.failure : Ext.emptyFn,
			success: function(entries) {
				var i = 0,
					entry = null,
					entryPathSplit = null,
					entryFileName = null;
				for (; i < entries.length; i++ ){
					entry = entries[i];
					entryPathSplit = entry.path.split('/');
					entryFileName = entryPathSplit[entryPathSplit.length - 1];
					if (entryFileName == config.fileName && !entry.directory) {
						// File exists; we're done
						if (config.success) {
							config.success(true, entry);
						}
						return;
					}
				} // eo for

				// If we got this far without returning it means we didn't find out file
				if (config.success) {
					config.success(false);
				}
			} // eo success
		}); // eo parentFolder.readEntries({]
	} // eo isFileExist()
});