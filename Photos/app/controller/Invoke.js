Ext.define('Photos.controller.Invoke', {
    extend: 'Ext.app.Controller',

    config: {

    	refs: {
    		selectButton: 'button[action=useSelected]',    		
    		cancelBtn: 'button[action=cancelInvoke]'
    	},

    	control: {
			selectButton: {
				tap:"useSelectedTapped"
			},

			cancelBtn: {
				tap:"cancel"
			}
    	},


    	selectedImages: {}
    },


	launch: function(){
        this.imageCount = 0;

        this.setupInvoke();
        this.watchStore();

    },


    setupInvoke: function(){
    	var self = this;
    	Ext.onSpaceReady(function(){

    		console.log("Space is ready!");

    		Ext.space.Invoke.onMessage(function(senderId, message) {
    			console.log("got invoke message",senderId, message);
    			self.showInvokeUX();
	        	self.invokeRequest = new Ext.Promise();
	        	return self.invokeRequest;
	        });

    	});
 
    },    

	watchStore: function(){
		var store = Ext.getStore('photos');
        var self = this;
        var selectedImages = this.getSelectedImages();
         
		store.on("updaterecord", function(store, record, nId, oId, fields, values){
		    var temp = selectedImages[record.get("url")];
		    console.log("selectedImages", record.get("url"));	
		    if(record.get('selected')){
		    	if(!temp) {
		    		selectedImages[record.get("url")] = record;
		    		self.imageCount++;
		    	}
		    } else {
		    	delete selectedImages[record.get("url")];
		    	if(temp){
		        	self.imageCount--;	
		    	}
		    } 
		    self.getSelectButton().setDisabled(self.imageCount <= 0);
		    console.log("selectedImages",selectedImages,self.imageCount);

		}); 
    },



    useSelectedTapped: function(){
    	var images = this.getSelectedImages();
    	console.log("haz images?", images);
    	var urls = [];

    	for(key in images){
    		console.log("selected image", key);
    		urls.push(key);
    	}
    	if(this.invokeRequest){
			console.log("sending invoke response ", urls);
			this.invokeRequest.fulfill({images: urls});
			this.finishInvoke();
    	}
    },

    cancel: function(){
    	console.log("cancel");
		if(this.invokeRequest){
			invokeRequest.fulfill([]);
			this.finishInvoke();
		}
    },


    showInvokeUX: function(){
    	this.getCancelBtn().setHidden(false);
    	this.getSelectButton().setHidden(false);
    },


    finishInvoke: function(){
    	this.invokeRequest = null;
    	this.getCancelBtn().setHidden(true);
    	this.getSelectButton().setHidden(true);
    }


});

