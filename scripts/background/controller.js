'use strict';
angular.module('background.controllers', [])

.controller('BackgroundController', function($scope, $rootScope, requestService, $q, $timeout) {
    $scope.appItems = [];
    $scope.uniqueTags = [];
    $scope.inProgress = false;
    $scope.popupId = undefined;

    chrome.runtime.onMessage.addListener(

        function(request, sender, sendResponse) {
            if (request.message === "init") {
                init();
            }
            if (request.message === "openOptionsPage") {
                chrome.runtime.openOptionsPage(function() {});
            }
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
                }

            }*/

        });

    var init = function() {
        console.log("init!");
        chrome.storage.local.get(["options"], function(items) {
            if (items.options && items.options.notifications !== undefined) {
                if (items.options.view === "panel") {
                    chrome.browserAction.setPopup({
                        popup: ''
                    });
                    console.log("should open panel");
                    if (!chrome.browserAction.onClicked.hasListener(onBrowserActionClicked)) {
                        chrome.browserAction.onClicked.addListener(onBrowserActionClicked);
                    }
                } else {
                    chrome.browserAction.onClicked.removeListener(onBrowserActionClicked);
                }
            } else {
                // new user / init options / cleared local storage
                setOptionsForNewUser();
            }
        });

        checkAlarm();
    };

    if (!chrome.browserAction.onClicked.hasListener(onBrowserActionClicked)) {
        chrome.browserAction.onClicked.addListener(onBrowserActionClicked);
        /*$timeout(function() {
            if (!isPopupOpen()) {
                onBrowserActionClicked();
            }

        }, 100);*/

    }

    //message: message to send to content script
    function onBrowserActionClicked(message) {

        if (isPopupOpen()) {
            //chrome.windows.update($scope.popupId, { "state": "maximized" }); 
            return;
        }
        var popupURL = chrome.extension.getURL("popup.html");
        chrome.windows.create({
                url: popupURL,
                type: 'panel',
                state: 'docked',
                height: 500,
                width: 430
            },
            function(windowInfo) {
                console.log("trying to send message:", message);
                $scope.popupId = windowInfo.id;
                $timeout(function() {
                    chrome.runtime.sendMessage({
                        message: "clickedBrowserAction",
                        action: message
                    });
                    if (message !== undefined) {
                        window.close();
                    }
                }, 500);
                if (message === undefined) {
                    window.close();
                }
            });

    }
    /*if (chrome.runtime.onStartup) {
        chrome.runtime.onStartup.addListener(function() {
            init();
        });
    }*/

    function checkAlarm() {
        getUserOption({
            name: "updateInterval",
            callback: function(result) {
                chrome.alarms.get("spbSteamSales", function(alarm) {
                    if (alarm === undefined || (alarm && alarm.periodInMinutes !== result)) {
                        var period = result ? result : 5;
                        if (alarm) {
                            //console.log("Alarm period changed: old/new", alarm.periodInMinutes, result);
                        } else {
                            //console.log("Alarm undefined!");
                        }      
                        chrome.alarms.clear("spbSteamSales", function() {
                            chrome.alarms.create("spbSteamSales", {
                                when: Date.now(),
                                delayInMinutes: null,
                                periodInMinutes: period
                            });
                        });
                    }
                });
            }
        });
        /*chrome.alarms.get("spbSteamSales", function(alarm) {
            //console.log("Alarm defined?", alarm);
            if (alarm === undefined) {
                getUserOption({
                    name: "updateInterval",
                    callback: function(result) {
                        chrome.alarms.create("spbSteamSales", {
                            when: Date.now() + 1000,
                            delayInMinutes: null,
                            periodInMinutes: result
                        });
                    }
                });

            }
        });*/
    }



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

        if (alarm.name === "spbSteamSales") {
            var d = new Date();
            console.log("SPB alert: ", d.toUTCString());
            checkAlarm();
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
                        getUserOption({
                            group: "notifications",
                            name: "enabled",
                            callback: function(result) {
                                if (result === true) {
                                    var msg = "",
                                        name = "";
                                    for (var l = newSales.length - 1; l >= 0; l--) {
                                        msg = newSales[l].price.discount + "% from " + newSales[l].price.original + " to " + newSales[l].price.final.replace(/\s/g, '');
                                        if (newSales[l].name.length > 18) {
                                            name = newSales[l].name.substring(0, 15) + "...";
                                        } else {
                                            name = newSales[l].name;
                                        }
                                        notificationOptions.items.push({
                                            title: name,
                                            message: msg
                                        });
                                    }

                                    chrome.notifications.create("spb_newSales", notificationOptions, function() {
                                        //console.log(notificationId);
                                        newSales = [];

                                    });
                                }
                            }
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
                        chrome.storage.local.set({
                            'app': $rootScope.storageReference['app'],
                            'bundle': $rootScope.storageReference['bundle'],
                            'package': $rootScope.storageReference['package']
                        }, function() {
                            console.log("...Done!");
                        });
                    });


                }, function(reason) {
                    console.log("Error: ", reason);
                }, function(update) {
                    //console.log("Update: ", update);
                    var tmp_loadCanvasArg = Math.round(update * 100);

                    chrome.runtime.sendMessage({
                        message: "loadCanvas",
                        arg: tmp_loadCanvasArg
                    });

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
                                        if ($rootScope.storageReference[type][id]._tolerance < -4) {
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
                    chrome.storage.local.set({
                        'app': $rootScope.storageReference['app'],
                        'bundle': $rootScope.storageReference['bundle'],
                        'package': $rootScope.storageReference['package']
                    }, function() {
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
                if (!isPopupOpen()) {
                    onBrowserActionClicked("latestSales");
                    chrome.notifications.clear("spb_newSales", function() {

                    });
                }
            } else if (buttonIndex === 1) {
                chrome.runtime.openOptionsPage(function() {
                    console.log("Opened option page");
                    chrome.notifications.clear("spb_newSales", function() {

                    });
                });
            }
        }
    });

    if (chrome.runtime.onInstalled) {
        chrome.runtime.onInstalled.addListener(function(details) {

            //Update from version 1.x.x.x
            if (details.reason === "install" ||
                (details.reason === "update" && details.previousVersion.startsWith("1"))) {
                //setOptionsForNewUser();
            }
        });
    }

    function setOptionsForNewUser() {
        console.log("Setting initial options for new user");
        var store = {
            options: {
                view: "default",
                darkmode: true,
                updateInterval: 5,
                notifications: {
                    enabled: true,
                    wishlistOnly: false,
                    rules: []
                },
                trackingEnabled: true,
                takeIntroTour: true
            }
        };

        chrome.storage.local.set(store);
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

    function isPopupOpen() {
        var views = chrome.extension.getViews();
        var bool = false;
        console.log("Views: ", views);
        //console.log("Views2: ", views2);
        for (var i = views.length - 1; i >= 0; i--) {
            if (views[i].spb) {
                bool = true;
            }
        }
        return bool;
    }

    function getUserOption(args) {
        chrome.storage.local.get(["options"], function(items) {
            if (args.group === undefined) {
                if (items.options && items.options[args.name] !== undefined) {
                    args.callback(items.options[args.name]);
                } else {
                    args.callback(undefined);
                }
            } else {
                if (items.options && items.options[args.group][args.name] !== undefined) {
                    args.callback(items.options[args.group][args.name]);
                } else {
                    args.callback(undefined);
                }
            }
        });
    }

    init();
});