'use strict';
angular.module('background.controllers', [])

.controller('BackgroundController', function($scope, $rootScope, requestService, $q) {
    $scope.appItems = [];
    $scope.uniqueTags = [];
    $scope.inProgress = false;

    chrome.runtime.onMessage.addListener(

        function(request, sender, sendResponse) {
            if (request.message === "init") {
                init();
                /*if ($scope.inProgress === true) {
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
                    }).then(function(detailedInfo) {
                            //console.log("Done - All User Tags: ", tags);
                            var tmp_tags = [];

                            $.each(detailedInfo.tags, function(index, value) {
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
                                    $scope.appItems[i].userTags = detailedInfo[$scope.appItems[i].appid].tags;

                                } else if ($scope.appItems[i].type === 'package') {
                                    $scope.appItems[i].userTags = detailedInfo[$scope.appItems[i].packageid].tags;
                                } else if ($scope.appItems[i].type === 'bundle') {
                                    $scope.appItems[i].userTags = detailedInfo[$scope.appItems[i].bundleid].tags;
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
                }*/

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
                } else {
                    chrome.browserAction.onClicked.removeListener(onBrowserActionClicked);
                }
            } else {
                // new user / init options / cleared local storage
                var store = {
                    options: {}
                };
                store["options"]["view"] = "default";
                store["options"]["darkmode"] = false;
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
                window.close();
            });

    }

    chrome.runtime.onStartup.addListener(function() {
        init();
    });

    //!TODO only if alarm doesn't exist yet
    chrome.alarms.create("spbSteamSales", {
        when: Date.now() + 1000,
        delayInMinutes: null,
        periodInMinutes: 10
    });

    chrome.alarms.onAlarm.addListener(function(alarm) {
        var newSales = [];
        var newSalesIds = [];

        var notificationOptions = {
            type: "list",
            title: "New Sales arrived!",
            message: "",
            iconUrl: "img/Icon128x128small.png",
            items: [],
            buttons: [{
                title: "View"
            }, {
                title: "Change notification settings"
            }]
        };

        //!TODO Check integrity aka check if items still on sale or not

        if (alarm.name === "spbSteamSales") {
            var d = new Date();
            console.log("SPB alert: ", d.toUTCString());

            //get all sales
            //check if sales are new 
            //remove apps from storage which are no longer on sale
            //return new sales?
            requestService.getAllAppsOnSale()
                .then(function(result) {
                    var type, id;
                    var XHRs = [];

                    $rootScope.lastTmpStorage = $.extend(true, {}, $rootScope.tmpStorage);
                    $rootScope.tmpStorage = {
                        'bundle': {},
                        'app': {},
                        'package': {}
                    };
                    for (var j = result.length - 1; j >= 0; j--) {
                        console.log("Result length: ", result.length);
                        type = result[j].type;
                        id = result[j].id;

                        //use this to lookup if items in storage are no longer in sale
                        $rootScope.tmpStorage[type][parseInt(id)] = {};
                        $rootScope.tmpStorage[type][parseInt(id)] = result[j];
                    }

                    for (var i = result.length - 1; i >= 0; i--) {
                        type = result[i].type;
                        id = result[i].id;
                        //is in storage and correctly represented
                        if ($rootScope.storageReference[type][id] && $rootScope.storageReference[type][id].price) {
                            //already in storage
                            //check if discount changed
                            //!TODO why is this buggy
                            if ($rootScope.storageReference[type][id].price.discount !== result[i].price.discount) {
                                console.log("Discount changed!", $rootScope.storageReference[type][id], result[i]);

                                //should leave details like tags intact
                                if (result[i].price.discount !== 0) {
                                    console.log("Discount changed and greather than 0");
                                    result[i].when = Date.now();
                                    newSales.push(result[i]);
                                    var t = $rootScope.storageReference[type][id].price.discount;
                                    console.log(t, $rootScope.storageReference[type][id].price.discount);
                                    $.extend($rootScope.storageReference[type][id], result[i]);
                                    $rootScope.storageReference[type][id]._tolerance = 0;
                                    //console.log(t, $rootScope.storageReference[type][id].price.discount);
                                }

                            }

                            if ($rootScope.storageReference[type][id].details === undefined ||
                                $rootScope.storageReference[type][id].details.tags === undefined) {
                                (function(type, id) {
                                    XHRs.push(requestService.getAppItemDetails(result[i])
                                        .then(function(details) {
                                            //console.log("getAppItemDetails done: ", details, type, id);
                                            $rootScope.storageReference[type][id].details = details;
                                        })
                                    );
                                })(type, id);
                            }
                        } else {
                            console.log("Found new sale!");
                            if (result[i].price.discount !== 0) {
                                result[i].when = Date.now();
                                newSales.push(result[i]);

                            }
                            console.log(result[i], "type: ", type, "id: ", id);
                            $rootScope.storageReference[type][id] = result[i];
                            $rootScope.storageReference[type][id]._tolerance = 0;
                            //!TODO Lookup tags def. not known
                            //closure to make sure type and id get passed to promises
                            (function(type, id) {
                                XHRs.push(requestService.getAppItemDetails(result[i])
                                    .then(function(details) {
                                        //console.log("getAppItemDetails done: ", details, type, id);
                                        $rootScope.storageReference[type][id].details = details;
                                    })
                                );
                            })(type, id);


                        }
                    }

                    if (newSales.length !== 0) {
                        var msg = "";
                        for (var j = newSales.length - 1; j >= 0; j--) {
                            msg = " Discount: " + newSales[j].price.discount;
                            notificationOptions.items.push({
                                title: newSales[j].name,
                                message: msg
                            });
                        }
                        chrome.notifications.create("spb_newSales", notificationOptions, function() {
                            //console.log(notificationId);
                        });
                    }

                    $q.all(XHRs).then(function() {
                        console.log("ALL DONE?!", $rootScope.storageReference);
                        //cleanup
                        console.log($rootScope.storageReference,
                            Object.size($rootScope.storageReference.app),
                            Object.size($rootScope.storageReference.package),
                            Object.size($rootScope.storageReference.bundle));
                        console.log($rootScope.tmpStorage,
                            Object.size($rootScope.tmpStorage.app),
                            Object.size($rootScope.tmpStorage.package),
                            Object.size($rootScope.tmpStorage.bundle));
                        /*chrome.storage.local.set($rootScope.storageReference);*/
                        chrome.runtime.sendMessage({
                            message: "appItemsDone"
                        });

                        console.log("Saving in storage...");
                        chrome.storage.local.set($rootScope.storageReference, function() {
                            console.log("...Done!");
                        });
                    });


                }, function(reason) {
                    console.log("Error: ", reason);
                }, function(update) {
                    /*console.log("Update: ", update, update.length);
                    for (var j = update.length - 1; j >= 0; j--) {

                        var type = update[j].type;
                        var id = update[j].id;

                        //use this to lookup if items in storage are no longer in sale
                        if ($rootScope.tmpStorage[type][parseInt(id)] !== undefined) {
                            console.log("already in tmpStorage, wtf?", update[j]);
                            console.log("this is whats in storage: ", $rootScope.tmpStorage[type][parseInt(id)]);
                        } else {
                            $rootScope.tmpStorage[type][parseInt(id)] = {};
                            $rootScope.tmpStorage[type][parseInt(id)] = update[j];
                        }

                    }
                    console.log($rootScope.tmpStorage, Object.size($rootScope.tmpStorage.app), Object.size($rootScope.tmpStorage.package), Object.size($rootScope.tmpStorage.bundle));*/
                })
                .then(function() {
                    console.log("Finding items that are no longer on sale....");
                    $.each($rootScope.storageReference, function(type, elements) {
                        if ($.inArray(type, ["app", "bundle", "package"]) !== -1) {
                            $.each(elements, function(id, details) {
                                if ($rootScope.tmpStorage[type][id] === undefined && $rootScope.storageReference[type][id].price &&
                                    $rootScope.storageReference[type][id].price.discount > 0) {
                                    console.log("Didn't find item, lower tolereance ", $rootScope.storageReference[type][id]);
                                    if ($rootScope.storageReference[type][id]._tolerance !== undefined) {
                                        $rootScope.storageReference[type][id]._tolerance -= 1;
                                        if ($rootScope.storageReference[type][id]._tolerance < -5) {
                                            console.log("Tolerance below threshhold, no longer on sale: ", $rootScope.storageReference[type][id]);
                                            $rootScope.storageReference[type][id].price.discount = 0;
                                            $rootScope.storageReference[type][id]._tolerance = 0;
                                        }
                                    } else {
                                        $rootScope.storageReference[type][id]._tolerance = -1;
                                    }

                                }
                            });
                        }
                    });
                    console.log("Saving in storage...");
                    chrome.storage.local.set($rootScope.storageReference, function() {
                        console.log("...Done!");
                    });
                });



        }
    });

    Object.size = function(obj) {
        var size = 0,
            key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                size++;
            }
        }
        return size;
    };

    chrome.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex) {
        if (notificationId === "spb_newSales") {

            if (buttonIndex === 0) {
                var views = chrome.extension.getViews();
                var views2 = chrome.windows.getAll();
                console.log("Views: ", views);
                console.log("Views2: ", views2);
                if (views) {
                    console.log("panel open");
                    //onBrowserActionClicked();
                }
                if (views.length === 0) {
                    console.log("popup open");
                }
            } else if (buttonIndex === 1) {
                chrome.runtime.openOptionsPage(function() {
                    console.log("Opened option page");
                });
            }
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

    //!TODO
    /*$scope.$watch(function() {
        return $rootScope.storageReference;
    }, function(newValue, oldValue) {
        console.log("Storage Reference changed! Save it? new / old: ", newValue, oldValue);
        if (newValue !== undefined) {
            
        }
        //scope apply or sth? notify popup script of changes necessary?
    });*/

    init();
});