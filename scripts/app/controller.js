'use strict';
angular.module('SteamPiggyBank.controllers', ['ui.unique', 'ui.select', 'ui.grid', 'ui.grid.selection', 'ui.grid.resizeColumns', 'ui.grid.saveState', 'ui.grid.moveColumns', 'ui.grid.pinning'])

.controller('PopupController', function($scope, $rootScope, $window, $q, uiGridConstants) {
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
    };
    $scope.appItems = {
        all: [],
        filtered: []
    };
    $scope.tags = {
        unique: [],
        active: [],
        newUnique: []
    };
    $scope.options = {
        view: "default"
    };
    $scope.gridOptions = {
        enableSorting: true,
        rowHeight: 45,
        enableFiltering: true,
        enableGridMenu: true,
        onRegisterApi: function(gridApi) {
            $scope.gridApi = gridApi;
        },
        columnDefs: [{
            field: 'name',
            type: 'string',
            displayName: 'Title',
            cellTemplate: "templates/titleTemplate.html",
            cellClass: "result-capsule",
            filter: {
                placeholder: 'Name...'
            },
            minWidth: 130
        }, {
            field: 'userTags',
            enableSorting: false,
            cellTemplate: "templates/tagsTemplate.html",
            filter: {
                placeholder: 'fps, rpg, ...',
                condition: function(searchTerm, cellValue) {
                    //var separators = ['-', '/', ':', ';', ','];
                    var strippedValue = searchTerm.split(/\s?,\s?/).filter(Boolean);
                    var bReturnValue = false;

                    if (cellValue && cellValue.length) {
                        for (var i = strippedValue.length - 1; i >= 0; i--) {
                            var sValueToTest = strippedValue[i].replace('\\', '');
                            bReturnValue = false;
                            for (var j = cellValue.length - 1; j >= 0; j--) {
                                if (cellValue[j].toLowerCase().indexOf(sValueToTest.toLowerCase()) !== -1) {
                                    bReturnValue = true;
                                }
                            }
                            if (bReturnValue === false) {
                                break;
                            }
                        }

                    }


                    return bReturnValue;
                }
            }
        }, {
            field: 'released',
            displayName: 'Release Date',
            type: 'date',
            visible: false
        }, {
            field: 'type',
            displayName: 'Type',
            visible: false,
            filter: {
                type: uiGridConstants.filter.SELECT,
                selectOptions: [{}]
            }
        }, {
            field: 'urc',
            displayName: 'URC',
            type: 'number',
            width: '15%',
            cellTemplate: 'templates/urcTemplate.html',
            filters: [{
                condition: function(searchTerm, cellValue) {
                    if (cellValue.percent && parseInt(cellValue.percent.replace('%', '')) >= parseInt(searchTerm)) {
                        return true;
                    }
                },
                placeholder: 'from...',
                disableCancelFilterButton: true
            }, {
                condition: function(searchTerm, cellValue) {
                    if (cellValue.percent && parseInt(cellValue.percent.replace('%', '')) <= parseInt(searchTerm)) {
                        return true;
                    }
                },
                placeholder: '...to',
                disableCancelFilterButton: true
            }],
            sortingAlgorithm: function(a, b) {
                //compare age property of the object
                if (a.score < b.score) {
                    return -1;
                } else if (a.score > b.score) {
                    return 1;
                } else {
                    return 0;
                }
            }
        }, {
            field: 'price.discount',
            cellTemplate: 'templates/discountTemplate.html',
            displayName: 'Discount',
            width: '15%',
            filters: [{
                condition: uiGridConstants.filter.GREATER_THAN_OR_EQUAL,
                placeholder: 'from...',
                disableCancelFilterButton: true
            }, {
                condition: uiGridConstants.filter.LESS_THAN_OR_EQUAL,
                placeholder: '...to',
                disableCancelFilterButton: true
            }],
            sortingAlgorithm: function(a, b) {
                //compare age property of the object
                if (a > b) {
                    return -1;
                } else if (a < b) {
                    return 1;
                } else {
                    return 0;
                }
            }
        }, {
            field: 'price.finalsize',
            displayName: 'Price',
            type: 'number',
            width: '15%',
            cellTemplate: 'templates/priceTemplate.html',
            filters: [{
                condition: uiGridConstants.filter.GREATER_THAN_OR_EQUAL,
                placeholder: 'from...',
                disableCancelFilterButton: true
            }, {
                condition: uiGridConstants.filter.LESS_THAN_OR_EQUAL,
                placeholder: '...to',
                disableCancelFilterButton: true
            }]
        }],
        data: []
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

    // Init

    chrome.runtime.sendMessage({
        message: "init",
        animate_status: animate
    }, function(response) {
        if (response !== undefined) {
            $scope.appItems.all = response.appItems;
            $scope.appItems.filtered = response.appItems;
            $scope.gridOptions.data = response.appItems;
            $scope.tags.unique = response.uniqueTags;
            /*var tmpTags = [];
            for (var i = response.uniqueTags.length - 1; i >= 0; i--) {
                tmpTags[i] = {};
                tmpTags[i].value = i;
                tmpTags[i].label = response.uniqueTags[i];
            }
            console.log("tmpTags: ", tmpTags);
            $scope.gridOptions.columnDefs[1].filter.selectOptions = tmpTags;*/
            $scope.disabled.search = false;
            $scope.disabled.select = false;
            $scope.$apply();
        }
    });

    chrome.storage.local.get(["options"], function(items) {
        if (items.options) {
            console.log("Got options: ", items.options);
            $scope.options = items.options;
            if (items.options.states) {
                $scope.restoreState();
            }
        }
    });

    beginAnimation();

    // Init end 

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
                /*var tmpTags = [];
                for (var i = request.tags.length - 1; i >= 0; i--) {
                    tmpTags[i] = {};
                    tmpTags[i].value = i;
                    tmpTags[i].label = request.tags[i];
                }
                console.log("tmpTags: ", tmpTags);
                $scope.gridOptions.columnDefs[1].filter.selectOptions = tmpTags;*/
                $scope.disabled.select = false;
                $scope.$apply();
            } else if (request.message === "tagsUpdate") {
                $scope.appItems.all = request.appItems;
                $scope.$apply();
            }
            //might cause errors!
            $scope.appItems.filtered = $scope.appItems.all;
            $scope.gridOptions.data = $scope.appItems.all;
        }
    );

    $scope.changeOrder = function(order) {
        //console.log("Old order: " + $scope.orderExp + " Old reverse: " + $scope.orderReverse);
        $scope.track("event", "change_order", "click");
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
        $scope.track("event", "Apps", "click");
        event.preventDefault();
        if (event.which === 1) {
            window.open(app.url, "_blank");
        }
    };

    $scope.track = function(type, element, action) {
        if (type === 'event') {
            //ga('send', 'event', element, action);
        } else if (type === 'pageview') {
            //ga('send', 'pageview', element);
        }

    };
    $scope.track('pageview', '/popup.html');

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
    };

    $scope.authorize = function() {
        //openid flow, scheint zu gehen

        // chrome.identity.launchWebAuthFlow({
        //         'url': 'https://steamcommunity.com/openid/login?openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.mode=checkid_setup&openid.realm=https%3A%2F%2Fmnadageogkcibhmepnladdkgajhppakd.chromiumapp.org%2F&openid.return_to=https%3A%2F%2Fmnadageogkcibhmepnladdkgajhppakd.chromiumapp.org%2Findex.html',
        //         'interactive': true
        //     },
        //     function(redirect_url) {
        //         console.log(parseURL(redirect_url));
        //     });
    };

    $scope.changeView = function() {
        $scope.track("event", "change_view", "click");
        chrome.storage.local.get(["options"], function(items) {
            var newOptions = {
                options: {}
            };
            if (items.options) {
                newOptions["options"] = items.options;
                if (items.options.view === "panel") {
                    newOptions["options"]["view"] = "default";
                    $scope.options["view"] = "default";
                    chrome.storage.local.set(newOptions);

                    chrome.browserAction.setPopup({
                        popup: 'popup.html'
                    });
                    chrome.runtime.reload();
                    setTimeout(window.close(), 1000);
                } else if (items.options.view === "default") {
                    newOptions["options"]["view"] = "panel";
                    chrome.storage.local.set(newOptions);
                    $scope.options["view"] = "panel";
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

            }
        });
    };

    $scope.$watch('tags.active', function() {
        //console.log($scope.tags.active);

        var tmp = [];

        for (var i = $scope.appItems.all.length - 1; i >= 0; i--) {
            var bool = true;
            for (var j = $scope.tags.active.length - 1; j >= 0; j--) {
                if ($.inArray($scope.tags.active[j], $scope.appItems.all[i].userTags) === -1) {
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

    $scope.toggleFiltering = function() {
        $scope.gridOptions.enableFiltering = !$scope.gridOptions.enableFiltering;
        $scope.gridApi.core.notifyDataChange(uiGridConstants.dataChange.COLUMN);
    };

    $scope.saveState = function(state) {
        var name = state ? state : "default";

        $scope.state = $scope.gridApi.saveState.save();
        chrome.storage.local.get(["options"], function(items) {
            var newOptions = {
                options: {}
            };
            if (items.options) {
                newOptions["options"] = items.options;
                if (!items.options.states) {
                    newOptions["options"]["states"] = {};
                }
                newOptions["options"]["states"][name] = $scope.state;
                chrome.storage.local.set(newOptions);
            }
        });

    };
    $scope.restoreState = function(state) {
        var name = state ? state : "default";

        chrome.storage.local.get(["options"], function(items) {
            if (items.options && items.options.states) {
                $scope.gridApi.saveState.restore($scope, items.options.states[name]);
            }
        });
    };
    $scope.toggleDarkmode = function() {
        var newOptions = {
            options: {}
        };
        chrome.storage.local.get(["options"], function(items) {
            if (items.options && items.options.darkmode) {
                newOptions = items.options;
                newOptions.darkmode = !newOptions.darkmode;
                chrome.storage.local.set(newOptions);
            } else {
                newOptions = items.options;
                newOptions.darkmode = true;
                chrome.storage.local.set(newOptions);
            }
        });
    };

    //=====================

    function extend(obj, src) {
        for (var key in src) {
            if (src.hasOwnProperty(key)) {
                obj[key] = src[key];
            }
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