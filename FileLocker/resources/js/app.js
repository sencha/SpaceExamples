angular.module('filelocker', ['ngRoute'])


.filter('filetype', function () {
    return function (files, types) {
      console.log("foo?", files, types);
      if(types['all'] === true) {
        return files;
      }

        var items = {
            types: types,
            out: []
        };
        var reg = /png|jpeg|gif/;
        angular.forEach(files, function (value, key) {
            var fileType = value.type;
            if(value.type.match(reg)){
              fileType = "image";
            }
            
            if (this.types[fileType]===true) {
                this.out.push(value);
            }
        }, items);
        return items.out;
    };
})

.filter('bytes', function() {
  return function(bytes, precision) {
    if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
    if (typeof precision === 'undefined') precision = 1;
    var units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB'],
      number = Math.floor(Math.log(bytes) / Math.log(1024));


    if(number < 2){ // B and kB don't need decimal 
      precision = 0;
    }

    return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
  }
})

.config(function($routeProvider) {
  $routeProvider
    .when('/', {
      controller:'ListCtrl',
      templateUrl:'list.html'
    })
    .otherwise({
      redirectTo:'/'
    });
})

.controller('ListCtrl', function($scope) {

  
  $scope.search = {name:'', type:''};

  $scope.showTypes  = {};

  $scope.showTypes['all'] = true;

  $scope.enabledTypeCount = 0;

  $scope.filterTypes = [{name: 'all', disabled: false} //all must be in position Zero.
                      , {name: 'pdf', disabled: true}
                      , {name: 'image', disabled: true}
                      , {name: 'doc', disabled: true}
                      , {name: 'xls', disabled: true}];

  var collection = Ext.space.SecureFiles.get("");//.get('filelocker');

  var watchDownloads = function() {
    Ext.space.Communicator.send({
        command: "DownloadManager#watchDownloads",
        callbacks: {
            onSuccess: function(responses) {
                console.log("download update", responses);
                fetchFiles();
            },
            onError: function(error) {
                 console.log("download error", error);
            }
        }
    });
  }


  //$scope.files = [{name:"Foo", type:"pdf", size: 1000, appName:"Mail", modified: new Date()}];
     
  ///collection.set({name: "foo.txt", type:"plain/text"}, "This is a test");

  var fetchFiles = function fetchFiles() {
    console.log("Calling fetch??");
  
    collection.query().then(function(items){

      console.log("Query Complete", items);
      $scope.files = items;

      $scope.$apply();

    }, function(){console.log("fail", arguments)});
  }


  watchDownloads();

  fetchFiles();

  
  $scope.confirmDelete = function(file, $event){
    $event.stopPropagation();
    Ext.space.Notification.show({
        title: 'Delete File: ' + file.name,
        message: 'Do you want to delete this file?',
        buttons: ['Yes','No'],
        callback: function(button) {
          console.log("delete prompt response", arguments);
            if (button === "yes") {
                file.remove().then(function(){
                  fetchFiles();
                });
            } else {
                console.log('Nope');
            }
        }
    });
  }

  $scope.openFile = function(file){
      file.view();
  }

  $scope.toggleFilter = function(event, filter) {
    var types = $scope.filterTypes;

    filter.disabled = !filter.disabled;

    $scope.enabledTypeCount += filter.disabled ? -1 : 1;

    if(filter.name == 'all' || $scope.enabledTypeCount <= 0) {

      for(var i = 1, l = types.length; i<l; i++) {
          types[i].disabled = true;
      }
      $scope.enabledTypeCount = 0;
      $scope.showTypes = {};
      $scope.showTypes['all'] = true;
      types[0].disabled = false;
      
    } else {

      types[0].disabled = true;
      $scope.showTypes['all'] = false;

    }

    $scope.showTypes[filter.name] = !filter.disabled;

  }

});
