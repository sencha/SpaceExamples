angular.module('filelocker', ['ngRoute', 'ngTouch'])


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

function fetchAppList(){
  Ext.space.Applications.list().then(function(apps) {
      console.log("got apps ", apps);

        $scope.apps = apps;
        $scope.$apply();

    }, function(error) {
        log("Error fetching: " + error);
    });
}

Ext.onSpaceReady(function(){
  console.log("space ready");
  Ext.space.Fullscreen.enter();
  
  fetchAppList();

  Ext.space.Focus.onToggle(function(isForeground) {
    console.log("focus", isForeground);
    if(isForeground){
       Ext.space.Fullscreen.enter();
       fetchAppList();
    } else {
      Ext.space.Fullscreen.leave();
    }
  });

});
  
  
  $scope.openApp = function(app){
    console.log("App", app);
    app.open();
   
  }

  

});
