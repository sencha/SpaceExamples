/**
 * @class ImageGridList.store.Images
 * @extends Ext.data.Store
 * Description image store to display Ext.ux.touch.ImageGridList
 */
Ext.define('Photos.store.Images', {

    extend: 'Ext.data.Store',

    requires: [
    	'Photos.model.Image'
    ],

    config: {
    	storeId: 'photos',
    	model: 'Photos.model.Image'
    }
});