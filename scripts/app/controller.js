'use strict';
angular.module('SteamPiggyBank.controllers', ['ui.unique', 'ui.select'])

.controller('PopupController', function($scope, $rootScope, $window, $q) {
    Object.defineProperty($scope, "queryFilter", {
        get: function() {
            var out = {};
            out[$scope.queryBy || "$"] = $scope.query;
            return out;
        }
    });
    $scope.disabled = {
        search: true,
        select: true
    }
    $scope.appItems = {
        all: [],
        filtered: []
    };
    $scope.tags = {
        unique: [],
        active: []
    };
    $scope.options = {
        view: "default"
    };
    /*$scope.uniqueTags = [];
    $scope.activeTags = [];*/
    $scope.query = {};
    $scope.queryBy = '$';
    $scope.orderExp = '';

    $scope.orderReverse = false;
    $scope.displayLimit = 15;
    $scope.displayLimitChanged = false;

    //load animations variables
    var canvasLoaded = 0,
        interval,
        animate = true;

    chrome.runtime.sendMessage({
        message: "init",
        animate_status: animate
    }, function(response) {
        if (response !== undefined) {
            $scope.appItems.all = response.appItems;
            $scope.appItems.filtered = response.appItems;
            $scope.tags.unique = response.uniqueTags;
            $scope.disabled.search = false;
            $scope.disabled.select = false;
            $scope.$apply();
        }
    });

    chrome.storage.local.get(["options"], function(items) {
        if (items.options) {
            $scope.options = items.options;
        }
    });

    beginAnimation();

    chrome.runtime.onMessage.addListener(
        function(request, sender, response) {
            if (request.message === "loadCanvas") {

                loadCanvas(request.arg);

                if (request.arg === 100) {
                    $scope.disabled.search = false;
                    endAnimation();
                    setTimeout(function() {
                        loadCanvas(0);
                    }, 2000);
                    $scope.$apply();
                } else if (animate === true) {
                    beginAnimation();
                    animate = false;
                }
            } else if (request.message === "update") {
                $scope.appItems.all = $scope.appItems.all.concat(request.appItems);
                $scope.$apply();
            } else if (request.message === "appItemsDone") {
                $scope.disabled.search = false;
            } else if (request.message === "tags") {
                $scope.tags.unique = request.tags;
                $scope.disabled.select = false;
                $scope.$apply();
            } else if (request.message === "tagsUpdate") {
                $scope.appItems.all = request.appItems;
                $scope.$apply();
            }
            //might cause errors!
            $scope.appItems.filtered = $scope.appItems.all;
        }
    );

    $scope.changeOrder = function(order) {
        //console.log("Old order: " + $scope.orderExp + " Old reverse: " + $scope.orderReverse);
        $scope.track("change_order");
        if ($scope.orderExp === order) {
            if (!($scope.orderReverse === false || order === 'discount')) {
                $scope.orderExp = '';
            } else if (order === 'discount' && $scope.orderReverse === false) {
                $scope.orderExp = '';
            }
            $scope.orderReverse = !$scope.orderReverse;
        } else {
            $scope.orderReverse = order === 'discount' ? true : false;
            $scope.orderExp = order;
        }
    };

    $scope.onAppClick = function(app, event) {
        $scope.track("Apps");
        event.preventDefault();
        if (event.which === 1) {
            window.open(app.url, "_blank");
        }
    }

    $scope.track = function(element) {
        ga('send', 'event', element, 'click');
    }

    $(window).bind("scroll", function() {
        if ($(window).scrollTop() + $(window).height() > $(document).height() - 50 && $scope.displayLimitChanged === false) {
            $scope.displayLimit += 10;
            $scope.$apply();
            $scope.displayLimitChanged = true;
        } else if ($(window).scrollTop() <= 50) {
            $scope.displayLimit = 15;
            $scope.$apply();
            $scope.displayLimitChanged = true;
        }
        $scope.displayLimitChanged = false;
    });

    $scope.isLoading = function(request) {
        if (request === "appitems") {
            return $scope.disabled.search;
        } else if (request === "tags") {
            return $scope.disabled.select;
        }
    }

    $scope.authorize = function() {
        //openid flow, scheint zu gehen

        // chrome.identity.launchWebAuthFlow({
        //         'url': 'https://steamcommunity.com/openid/login?openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.mode=checkid_setup&openid.realm=https%3A%2F%2Fmnadageogkcibhmepnladdkgajhppakd.chromiumapp.org%2F&openid.return_to=https%3A%2F%2Fmnadageogkcibhmepnladdkgajhppakd.chromiumapp.org%2Findex.html',
        //         'interactive': true
        //     },
        //     function(redirect_url) {
        //         console.log(parseURL(redirect_url));
        //     });
    }

    $scope.changeView = function() {
        $scope.track("change_view");
        chrome.storage.local.get(["options"], function(items) {
            var new_options = {
                options: {}
            };
            if (items.options) {
                if (items.options.view === "panel") {
                    new_options["options"]["view"] = "default";
                    chrome.storage.local.set(new_options);
                    
                    chrome.browserAction.setPopup({
                        popup: 'popup.html'
                    });
                    window.close();
                } else {
                    new_options["options"]["view"] = "panel";
                    chrome.storage.local.set(new_options);
                    $scope.options["view"] = "panel";
                    
                    chrome.windows.create({
                            url: 'popup.html',
                            type: 'panel',
                            state: 'docked',
                            height: 500,
                            width: 430
                        },
                        function(windowInfo) {
                            if (!windowInfo.alwaysOnTop) {
                                chrome.windows.remove(windowInfo.id);
                                chrome.windows.create({
                                    url: 'popup.html',
                                    type: 'panel',
                                    state: 'popup',
                                    height: 500,
                                    width: 420
                                });
                            }
                            chrome.browserAction.setPopup({
                                popup: ''
                            });
                            window.close();
                        });
                }
                
            }
        });
    }

    $scope.$watch('query[queryBy]', function() {
        /*console.log($scope.query);
        console.log($scope.queryBy);*/
    });

    $scope.$watch('tags.active', function() {
        //console.log($scope.tags.active);

        var tmp = [];

        for (var i = $scope.appItems.all.length - 1; i >= 0; i--) {
            var bool = true;
            for (var j = $scope.tags.active.length - 1; j >= 0; j--) {
                if (!($.inArray($scope.tags.active[j], $scope.appItems.all[i].userTags) > -1)) {
                    bool = false;
                }
            }
            if (bool === true) {
                tmp.push($scope.appItems.all[i]);
            }
        }
        $scope.appItems.filtered = tmp;
    });


    //=====================

    function extend(obj, src) {
        for (var key in src) {
            if (src.hasOwnProperty(key)) obj[key] = src[key];
        }
        return obj;
    }

    function loadCanvas(progress) {
        var canvas = document.getElementById("canvas"),
            context = canvas.getContext("2d"),
            cx = 20,
            cy = 20,
            r = 18,
            lw = 4;

        context.clearRect(0, 0, 40, 40);
        context.beginPath();
        context.arc(cx, cy, r, -(Math.PI / 180) * 90 - (Math.PI / 180) * progress * 3.6, -(Math.PI / 180) * 90, false);
        context.lineWidth = lw;
        context.strokeStyle = "#67c1f5";
        context.stroke();
    }

    var animation = function() {
        if ($('#stay').css("visibility") === "visible") {
            $('#stay').css("visibility", "hidden");
            $('#mid').css("visibility", "visible");
        } else if ($('#mid').css("visibility") === "visible") {
            $('#mid').css("visibility", "hidden");
            $('#jump').css("visibility", "visible");
        } else if ($('#jump').css("visibility") === "visible") {
            $('#jump').css("visibility", "hidden");
            $('#mid2').css("visibility", "visible");
        } else if ($('#mid2').css("visibility") === "visible") {
            $('#mid2').css("visibility", "hidden");
            $('#stay').css("visibility", "visible");
        }
    };

    function beginAnimation() {
        interval = setInterval(animation, 150);
    }

    function endAnimation() {
        clearInterval(interval);
        $('#stay').css("visibility", "visible");
        $('#mid').css("visibility", "hidden");
        $('#jump').css("visibility", "hidden");
        $('#mid2').css("visibility", "hidden");
    }

    //for openid
    function parseURL(url) {
        var parser = document.createElement('a'),
            searchObject = {},
            queries, split, i;
        // Let the browser do the work
        parser.href = url;
        // Convert query string to object
        queries = parser.search.replace(/^\?/, '').split('&');
        //console.log(queries);
        for (i = 0; i < queries.length; i++) {
            split = queries[i].split('=');
            searchObject[split[0]] = split[1];
        }
        return searchObject;
    }


});