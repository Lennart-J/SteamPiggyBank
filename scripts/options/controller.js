'use strict';
angular.module('options.controllers', [])

.controller('OptionsController', function($scope, $rootScope, $q, $timeout) {
    $scope.storage = {
        options: {
            notifications: {
                enabled: true,
                wishlistOnly: false,
                rules: []
            },
            trackingEnabled: true,
            takeIntroTour: true,
            updateInterval: 5
        }
    };

    $scope.saveOptions = function() {
        var valid = true;
        $.each($scope.storage.options, function(key, el) {
            if (el === undefined) {
                console.warn("Invalid options! Revert!");
                $scope.restoreOptions();
                //break
                valid = false;
                return false;
            }
        });
        if (valid) {
            chrome.storage.local.set($scope.storage, function() {
                console.log("Saved options: ", $scope.storage.options);
            });
        }
    };

    $scope.restoreOptions = function() {
        chrome.storage.local.get(["options"], function(items) {
            if (items.options) {
                $scope.storage.options = $.extend($scope.storage.options, items.options);
                $scope.$apply();
            }
        });

    };

    $scope.track = function(type, element, action) {
        chrome.storage.local.get(["options"], function(items) {
            if (items.options && items.options.trackingEnabled) {
                if (type === 'event') {
                    ga('send', 'event', element, action);
                } else if (type === 'pageview') {
                    ga('send', 'pageview', element);
                }
            }
        });
    };

    $scope.showMoreInfo = function(event) {
        $(event.currentTarget).parent().find('.info-text').toggle(100);
    };

    $scope.restoreOptions();
});