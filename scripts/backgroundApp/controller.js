'use strict';
angular.module('backgroundApp.controllers', [])

.controller('BackgroundController', function($scope, $rootScope, requestService, $q) {
    $scope.appItems = [];
    $scope.uniqueTags = [];
    $scope.inProgress = false;

    chrome.runtime.onMessage.addListener(

        function(request, sender, sendResponse) {

            if (request.message === "init") {
                if ($scope.inProgress === true) {
                    sendResponse({
                        message: 'cache',
                        appItems: $scope.appItems
                    })
                }
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
                        console.log("Done - All User Tags: ", tags);
                        var tmp_tags = [];

                        for (var i = tags.length - 1; i >= 0; i--) {
                            for (var j = tags[i].userTags.length - 1; j >= 0; j--) {
                                tmp_tags.push(tags[i].userTags[j]);
                            }
                        }
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
                    },
                    function(reason) {
                        console.log(reason);
                    },
                    function(userTagChunk) {
                        if (!userTagChunk) return;

                        //console.log(userTagChunk);
                        for (var i = $scope.appItems.length - 1; i >= 0; i--) {
                            for (var j = userTagChunk.length - 1; j >= 0; j--) {
                                if (userTagChunk[j].appId) {
                                    if ($scope.appItems[i].appid === userTagChunk[j].appId) {
                                        $scope.appItems[i].userTags = userTagChunk[j].userTags;
                                        break;
                                    }
                                } else if (userTagChunk[j].packageId) {
                                    if ($scope.appItems[i].packageId === userTagChunk[j].packageId) {
                                        $scope.appItems[i].userTags = userTagChunk[j].userTags;
                                        break;
                                    }
                                }
                            }
                        }
                        chrome.runtime.sendMessage({
                            message: "tagsUpdate",
                            appItems: $scope.appItems
                        });
                    }
                )
            }

        });

    function uniques(arr) {
        var a = [];
        for (var i = 0, l = arr.length; i < l; i++) {
            if (a.indexOf(arr[i]) === -1 && arr[i] !== '') {
                a.push(arr[i]);
            }
        }
        return a;
    }
});