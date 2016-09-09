'use strict';
angular.module('SteamPiggyBank.controllers', [
    'ui.unique', 'ui.select', 'ui.grid', 'ui.grid.selection', 'ui.grid.resizeColumns', 'ui.grid.saveState', 'ui.grid.moveColumns', 'ui.grid.pinning', 'ui.grid.autoResize'
])

.controller('PopupController', function($scope, $rootScope, $window, $timeout, $q, uiGridConstants, util) {
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
        gridMenuCustomItems: [{
            title: 'Save configuration',
            //icon: 'ui-grid-icon-filter',
            action: function($event) {
                $scope.saveState(); // $scope.blargh() would work too, this is just an example
            },
            context: $scope
        }, {
            title: 'Restore configuration',
            //icon: 'ui-grid-icon-filter',
            action: function($event) {
                $scope.restoreState(); // $scope.blargh() would work too, this is just an example
            },
            context: $scope,
            order: -1
        }],
        onRegisterApi: function(gridApi) {
            $scope.gridApi = gridApi;

            $timeout(function() {
                $scope.defaultState = $scope.gridApi.saveState.save();
                $scope.sortByLatestState = $.extend({}, $scope.defaultState);
                $scope.sortByLatestState.columns[3].sort = {
                    direction: "desc",
                    priority: 0
                };
                $scope.restoreState();
            }, 50);
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
            field: 'details.tags',
            displayName: 'User tags',
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
            field: 'when',
            displayName: 'When',
            cellTemplate: 'templates/whenTemplate.html',
            type: 'date',
            visible: false
        }, {
            field: 'type',
            displayName: 'Type',
            visible: false,
            filter: {
                type: uiGridConstants.filter.SELECT,
                selectOptions: [{
                    value: "app",
                    label: "App"
                }, {
                    value: "package",
                    label: "Package"
                }, {
                    value: "bundle",
                    label: "Bundle"
                }]
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
            },
            cellClass: function(grid, row, col, rowIndex, colIndex) {
                var val;
                if (grid.getCellValue(row, col).percent) {
                    val = parseInt(grid.getCellValue(row, col).percent.replace('%', ''));
                    if (val >= 80) {
                        return 'green';
                    } else if (val >= 50) {
                        return 'yellow';
                    } else {
                        return 'red';
                    }
                } else {
                    return '';
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

    $scope.animateStatus = true;
    $scope.sortByLatest = false;

    //load animations variables
    var canvasLoaded = 0,
        interval,
        animate = true;

    // Init

    chrome.runtime.sendMessage({
        message: "init"
    }, function(response) {
        /*if (response !== undefined) {
            $scope.appItems.all = response.appItems;
            $scope.appItems.filtered = response.appItems;
            //$scope.gridOptions.data = response.appItems;
            $scope.tags.unique = response.uniqueTags;
            var tmpTags = [];
            for (var i = response.uniqueTags.length - 1; i >= 0; i--) {
                tmpTags[i] = {};
                tmpTags[i].value = i;
                tmpTags[i].label = response.uniqueTags[i];
            }
            console.log("tmpTags: ", tmpTags);
            $scope.gridOptions.columnDefs[1].filter.selectOptions = tmpTags;
            $scope.disabled.search = false;
            $scope.disabled.select = false;
            $scope.$apply();
        }*/
    });

    function getItemsFromStorage() {
        chrome.storage.local.get(null, function(items) {
            var allItemsArray = [];

            console.log("Storage: ", items);
            if (items.options) {
                $scope.options = items.options;
                if (items.options.states) {
                    //fuck it restores old data 
                    // make button to reset to default
                    //$scope.restoreState();
                }
            }
            if (items.app) {
                $.each(items.app, function(key, el) {
                    if (!$.isArray(el) && el.price.discount !== 0) {
                        allItemsArray.push(el);
                    }
                });
                $.each(items.package, function(key, el) {
                    if (!$.isArray(el) && el.price.discount !== 0) {
                        allItemsArray.push(el);
                    }
                });
                $.each(items.bundle, function(key, el) {
                    if (!$.isArray(el) && el.price.discount !== 0) {
                        allItemsArray.push(el);
                    }
                });
                allItemsArray.sort(function(a, b) {
                    return a.relevance - b.relevance;
                });
                $scope.gridOptions.data = allItemsArray;
                $scope.$apply();
            }
        });
    }

    beginAnimation();

    // Init end 

    chrome.runtime.onMessage.addListener(
        function(request, sender, response) {
            if (request.message === "loadCanvas") {

                loadCanvas(request.arg);

                if (request.arg === 100) {
                    console.log("stop animation!");
                    endAnimation();
                    setTimeout(function() {
                        loadCanvas(0);

                        animate = true;
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
                /*$scope.disabled.search = false;*/
                getItemsFromStorage();
            } else if (request.message === "tags") {
                //$scope.tags.unique = request.tags;
                /*var tmpTags = [];
                for (var i = request.tags.length - 1; i >= 0; i--) {
                    tmpTags[i] = {};
                    tmpTags[i].value = i;
                    tmpTags[i].label = request.tags[i];
                }
                console.log("tmpTags: ", tmpTags);
                $scope.gridOptions.columnDefs[1].filter.selectOptions = tmpTags;*/
                //$scope.disabled.select = false;
                $scope.$apply();
            } else if (request.message === "tagsUpdate") {
                $scope.appItems.all = request.appItems;
                $scope.$apply();
            } else if (request.message === "clickedBrowserAction") {
                if (request.action === "latestSales") {
                    console.log("Got message to show latest Sales");
                    //if opened from notification always change view to "panel" because you cant open popup programatically
                    chrome.storage.local.get(["options"], function(items) {
                        var opts;
                        if (items.options) {
                            console.log("Set to panel");
                            opts = $.extend(true, {}, items.options);
                            opts.view = "panel";
                            chrome.storage.local.set(opts);
                            console.log(opts);
                            $scope.options = opts;
                            $scope.$apply();
                        }
                    });

                    $timeout(function() {
                        $scope.gridApi.saveState.restore($scope, $scope.sortByLatestState);
                    }, 500);
                }
            }
            //might cause errors!
            $scope.appItems.filtered = $scope.appItems.all;
            //$scope.gridOptions.data = $scope.appItems.all;
        }
    );

    /*$scope.changeOrder = function(order) {
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
    };*/

    $scope.onAppClick = function(row, event) {
        $scope.track("event", "Apps", "click");
        event.preventDefault();
        if (event.which === 1) {
            window.open(row.entity.url, "_blank");
        }
    };

    $scope.track = function(type, element, action) {
        // chrome.storage.local.get(["options"], function(items) {
        //     if (items.options && items.options.trackingEnabled) {
        //         if (type === 'event') {
        //             ga('send', 'event', element, action);
        //         } else if (type === 'pageview') {
        //             ga('send', 'pageview', element);
        //         }
        //     }
        // });
        util.track(type, element, action);
    };
    $scope.track('pageview', '/popup.html');
    /*
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
        });*/

    /*$scope.isLoading = function(request) {
        if (request === "appitems") {
            return $scope.disabled.search;
        } else if (request === "tags") {
            return $scope.disabled.select;
        }
    };*/

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
                    $scope.options["view"] = "panel";
                    chrome.storage.local.set(newOptions, function() {
                        var popupURL = chrome.extension.getURL("popup.html");
                        console.log(popupURL);
                        chrome.windows.create({
                                url: popupURL,
                                type: 'panel',
                                state: 'docked',
                                height: 500,
                                width: 430
                            },
                            function(windowInfo) {
                                window.close();
                            });
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
                newOptions = $.extend(true, {}, items);
                if (!items.options.states) {
                    newOptions["options"]["states"] = {};
                }
                newOptions["options"]["states"][name] = $scope.state;
                $scope.options = newOptions;
                chrome.storage.local.set(newOptions);
                getItemsFromStorage();
            }
        });

    };
    $scope.restoreState = function(state) {
        var name = state ? state : "default";

        chrome.storage.local.get(["options"], function(items) {
            if (items.options && items.options.states) {
                $scope.gridApi.saveState.restore($scope, items.options.states[name]);
            }
            getItemsFromStorage();
        });
    };
    $scope.toggleDarkmode = function() {
        var newOptions = {
            options: {}
        };
        chrome.storage.local.get(["options"], function(items) {
            if (items.options) {
                newOptions.options = items.options;
                newOptions.options.darkmode = items.options.darkmode === true ? false : true;
                chrome.storage.local.set(newOptions);
            }
            $scope.options.darkmode = newOptions.options.darkmode;
            $scope.$apply();
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

    


})

.controller('IntroController', function($scope, $rootScope, $timeout, util) {
    //introjs
    $scope.CompletedEvent = function(scope) {
        util.track("event", "IntroCompleted", "click");
        chrome.storage.local.get(["options"], function(items) {
            if (items.options) {
                items.options.takeIntroTour = false;
                chrome.storage.local.set(items);
            }
        });

    };

    $scope.ExitEvent = function(scope) {
        util.track("event", "IntroExit", "click");
        chrome.storage.local.get(["options"], function(items) {
            if (items.options) {
                items.options.takeIntroTour = false;
                chrome.storage.local.set(items);
            }
        });
    };

    $scope.ChangeEvent = function(targetElement, scope) {
        /*console.log("Change Event called");
        console.log(targetElement); //The target element
        console.log(this); //The IntroJS object*/
    };

    $scope.BeforeChangeEvent = function(targetElement, scope) {
        /*console.log("Before Change Event called");
        console.log(targetElement);
        if (this._currentStep === 10) {
            console.log($('.ui-grid-menu-button')[0]);
            $($('.ui-grid-menu-button')[0]).trigger("click");
        }
        console.log(this);*/
    };

    $scope.AfterChangeEvent = function(targetElement, scope) {
        /*console.log("After Change Event called");
        console.log(targetElement);*/
    };

    $scope.ShouldAutoStart = false;
    angular.element(document).ready(function() {
        $timeout(function() {
            $scope.IntroOptions = {
                steps: [{
                    intro: "<h2>Hello there!</h2>" +
                        "<div>This tour will show you the most <b>useful features</b> to help you configure the extension just as <b>you</b> like it!</div>" +
                        "<div>You can always skip it and take the tour later by visiting the extensions option page and ticking the right box!</div>"
                }, {
                    element: document.querySelectorAll('#pigCircle')[0],
                    intro: "When you see the piggy jump, it's checking for new sales.",
                    position: 'left'
                }, {
                    element: document.querySelectorAll('#pigCircle')[0],
                    intro: "All this hard work happens in the background. That means the you will always see the latest sales here even if you don't see the piggy jump!<br> You will get <b>notifications</b> when there are new sales!",
                    position: 'left'
                }, {
                    element: document.querySelector('.icon-row'),
                    intro: 'The left button will load the extension into its own popup window. You can also enable panels in chrome://falgs#enable-panels to get a nicer view!',
                    position: 'bottom'
                }, {
                    element: document.querySelector('.icon-row'),
                    intro: 'The right one toggles between light and dark mode.',
                    position: 'bottom'
                }, {
                    element: document.querySelectorAll('.ui-grid-header-cell')[0],
                    intro: "If you click on a column, it will sort cycle through descending, ascending and not sorting.<br> You can hold <b><code>SHIFT</code></b> to sort by multiple columns!",
                    position: 'bottom'
                }, {
                    element: document.querySelectorAll('.ui-grid-header-cell')[0],
                    intro: "You can also drag, resize and hide every column to only view the information you want.",
                    position: 'bottom'
                }, {
                    element: document.querySelectorAll('.ui-grid-header-cell')[1],
                    intro: "Every column has a filter box that fits the data it represents. ",
                    position: 'bottom'
                }, {
                    element: document.querySelectorAll('.ui-grid-header-cell')[1],
                    intro: "The user tags can be filtered by typing a comma separated list, for example \"rpg, action, early access\". It uses the language you set on the steam site.",
                    position: 'bottom'
                }, {
                    element: document.querySelectorAll('.ui-grid-menu-button')[0],
                    intro: "Here you can see more options, like all available columns. Clicking them will toggle their visibility.",
                    position: 'left'
                }, {
                    element: document.querySelectorAll('.ui-grid-menu-button')[0],
                    intro: "You can also save and load the customizations you made. This saves column visibility, size, position and which filters you chose for them, so it can be quite powerful!",
                    position: 'left'
                }, {
                    intro: "<h2>That's it for now!</h2>" +
                        "<div>If you have any more questions or feedback, don't hesitate to contact me via the Chrome Web Store page!</div>"
                }],
                showStepNumbers: false,
                exitOnOverlayClick: false,
                exitOnEsc: true,
                /*nextLabel: '<strong>NEXT!</strong>',
                prevLabel: '<span style="color:green">Previous</span>',*/
                skipLabel: 'Exit',
                doneLabel: 'Done!'
            };
            $timeout(function() {
                chrome.storage.local.get(["options"], function(items) {
                    if (items.options && items.options.takeIntroTour) {
                        $scope.StartIntro();

                        $('.introjs-tooltipbuttons a').each(function(index, element) {
                            $(this).removeAttr("href");
                        });
                        $('.introjs-bullets').find('a').each(function(index, element) {
                            $(this).css('cursor', 'pointer');
                            $(this).removeAttr("href");
                        });

                    }
                });
            }, 50);
        }, 300);

    });
});