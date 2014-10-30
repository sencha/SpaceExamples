angular.module('siChooseDirective', [])
 
  .directive('siChoose', function() {
    return {
      restrict: 'AE',
      templateUrl: 'choose.html'
    };
  });