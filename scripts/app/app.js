'use strict';
var spb = angular.module('SteamPiggyBank', ['SteamPiggyBank.controllers', 'SteamPiggyBank.services', 'angularMoment', 'angular-intro']);

spb.directive('opacity', function ($timeout) {
    return {
        link: function(scope, element, attrs) {
            var value = attrs.opacity;
            $timeout(function () {
                element[0].style.opacity = value;
            }, 100);
        }
    };
})

.run(function() {
    //console.log("hello");
    

});