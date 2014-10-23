
function log(message) {
    var div = document.createElement('div');

    div.textContent = message;
    console.log(message);

    byId('log').appendChild(div);
}


function wireBtn(id, fn){
    var button = byId(id);
    button.disabled = false;
    button.addEventListener('click', fn, true);
}

function byId(id){ 
    return document.getElementById(id)
}

function displayDownloadResults(file, download) {
    log("download complete " + download.fileName + " size (kb): " + Math.floor(download.totalBytes/1024));
    console.log("File, Download", file, download);
}


var href = document.location.href;
var basePath =href.substring(0,href.lastIndexOf("/")+1);


function toKB(bytes){
    return Math.floor(bytes/1024)
}

function percent(current, total){
    if(total > 0){
        return Math.round((current/total)*100) +  "%";
    }
    return "??";
}

    
function progressToString(div, label){
    return function(download) {
        div.innerHTML = label + " download:  " + percent(download.bytesDownloaded, download.totalBytes);
    }
}

var downloadDivs = ['downloadProgressOne','downloadProgressTwo','downloadProgressThree','downloadProgressFour'];


var downloadCounter = 0;

    

function downloadFile(fileName){
    console.log("basePath",basePath);
    log("Downloading " + fileName);

  

    var download = Ext.space.Downloads.download({ url:  basePath + fileName});

    download.on('progress', progressToString(downloadDivs[downloadCounter++], fileName));

/*    download.on('progress', function(download){
        console.log("progress", download.fileName, download.bytesDownloaded, download.totalBytes);
    });
*/
    download.then(displayDownloadResults, function(error){
        console.log("Error with file", fileName, error);
    }); 

    return download;
}


function downloadFiles(){

    var select = byId("downloadSelect");

    downloadCounter = 0;


    //This only works because there are 4 things in the select list. 
    //Add to the select list, and file name array.
    var howMany = select.selectedIndex + 1;
    log("Downloading " + howMany + " files");

    var files =  ["one.bin","two.bin","three.bin","four.bin"].slice(0, howMany);
   
    var results = files.map(downloadFile);

    Ext.Promise.whenComplete(results).then(function(completed){
        console.log(completed);
        log("downloads complete");
    });

}


function deleteDownloads(){
    Ext.space.SecureFiles.query().then(function(files) { 
        log("Deleting " + files.length);
        var toDelete = files.map(function(file){ 
                                    return file.remove();
                                });

        Ext.Promise.whenComplete(toDelete).then(function(completed){
            console.log(completed);
            log("Delete Complete " + completed.fulfilled.length);
        });


     });
}



Ext.onSpaceReady(function(){
   
    log("Space Ready");

   downloadDivs = downloadDivs.map(byId);

   
    wireBtn("downloadFiles", downloadFiles);
    wireBtn("deleteDownloads", deleteDownloads);

});