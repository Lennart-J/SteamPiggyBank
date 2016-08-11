'use strict';
angular.module('backgroundApp.controllers', [])

.controller('BackgroundController', function($scope, $rootScope, requestService, $q) {
    $scope.appItems = [];
    $scope.uniqueTags = [];
    $scope.inProgress = false;

    chrome.runtime.onMessage.addListener(

        function(request, sender, sendResponse) {
            if (request.message === "init") {
                init();
                if ($scope.inProgress === true) {
                    sendResponse({
                        message: 'cache',
                        appItems: $scope.appItems,
                        uniqueTags: $scope.uniqueTags
                    });
                    //return;
                }

                if ($scope.inProgress === false) {
                    $scope.inProgress = true;
                    requestService.getAllApps().then(function(allApps) {
                        console.log("Done: ", allApps);
                    }, function(reason) {
                        //console.log(reason);
                    }, function(update) {
                        var tmp_appItems = update[0];
                        var tmp_loadCanvasArg = Math.round(update[1] * 100);
                        if (request.animate_status === true) {
                            chrome.runtime.sendMessage({
                                message: "loadCanvas",
                                arg: tmp_loadCanvasArg
                            });
                        }
                        chrome.runtime.sendMessage({
                            message: "update",
                            appItems: tmp_appItems
                        });
                        $scope.appItems = $scope.appItems.concat(update[0]);
                    }).then(function() {
                        chrome.runtime.sendMessage({
                            message: "appItemsDone"
                        });
                        return requestService.getAllUserTags();
                    }).then(function(tags) {
                            //console.log("Done - All User Tags: ", tags);
                            var tmp_tags = [];

                            $.each(tags, function(index, value) {
                                for (var j = value.length - 1; j >= 0; j--) {
                                    tmp_tags.push(value[j]);
                                }
                            });

                            tmp_tags = uniques(tmp_tags);

                            chrome.runtime.sendMessage({
                                message: "loadCanvas",
                                arg: 100
                            });
                            chrome.runtime.sendMessage({
                                message: "tags",
                                tags: tmp_tags
                            });
                            $scope.uniqueTags = tmp_tags;

                            for (var i = $scope.appItems.length - 1; i >= 0; i--) {
                                if ($scope.appItems[i].type === 'app') {
                                    $scope.appItems[i].userTags = tags[$scope.appItems[i].appid];

                                } else if ($scope.appItems[i].type === 'package') {
                                    $scope.appItems[i].userTags = tags[$scope.appItems[i].packageid];
                                } else if ($scope.appItems[i].type === 'bundle') {
                                    $scope.appItems[i].userTags = tags[$scope.appItems[i].bundleid];
                                }

                            }
                            chrome.runtime.sendMessage({
                                message: "tagsUpdate",
                                appItems: $scope.appItems
                            });
                        },
                        function(reason) {
                            //console.log(reason);
                        },
                        function(userTagChunk) {
                            //console.log(userTagChunk);
                        }
                    );
                }

            }

        });

    var init = function() {
        chrome.storage.local.get(["options"], function(items) {
            if (items.options) {
                if (items.options.view === "panel") {
                    chrome.browserAction.setPopup({
                        popup: ''
                    });
                    chrome.browserAction.onClicked.removeListener(onBrowserActionClicked);
                    chrome.browserAction.onClicked.addListener(onBrowserActionClicked);
                }
                else {
                    chrome.browserAction.onClicked.removeListener(onBrowserActionClicked);
                }
            } else {
                var store = {
                    options: {}
                };
                store["options"]["view"] = "default";
                chrome.storage.local.set(store);
            }
        });
    };

    function onBrowserActionClicked() {

        chrome.runtime.sendMessage({
            message: "clickedBrowserAction"
        });
        chrome.windows.create({
                url: 'popup.html',
                type: 'panel',
                state: 'docked',
                height: 500,
                width: 430
            },
            function(windowInfo) {
                //     if (!windowInfo.alwaysOnTop) {
                //     chrome.windows.remove(windowInfo.id);
                //     chrome.windows.create({
                //         url: 'popup.html',
                //         type: 'popup',
                //         state: 'normal',
                //         height: 500,
                //         width: 420
                //     });
                // }
                window.close();
            });

    }

    function uniques(arr) {
        var a = [];
        for (var i = 0, l = arr.length; i < l; i++) {
            if (a.indexOf(arr[i]) === -1 && arr[i] !== '') {
                a.push(arr[i]);
            }
        }
        return a;
    }
    init();

    chrome.runtime.onStartup.addListener(function(){
        init();
    });
});