'use strict';
angular.module('background.services', [])

.service('util', function() {
    var currencyLocaleMap = {
        "GBP": "en-GB",
        "USD": "en-US",
        "EUR": "de-DE",
        "RUB": "ru-AD",
        "BRL": "br-DF",
        "JPY": "ja-JP",
        "IDR": "en",
        "MYR": "en",
        "PHP": "ph",
        "SGD": "en",
        "THB": "th",
        "AUD": "en-AU",
        "NZD": "en-NZ",
        "CAD": "en-CA",
        "NOK": "no",
        "KRW": "en",
        "TRY": "en",
        "MXN": "en"
    };

    this.formatPrice = function(val, currency) {
        var locale = currencyLocaleMap[currency];

        if (locale !== "") {
            return Number(val.toFixed(2) / 100).toLocaleString(locale, {
                style: "currency",
                currency: currency,
                minimumFractionDigits: 2
            }).replace(/\s/g, '');
        } else {
            return Number(val.toFixed(2) / 100).toLocaleString({
                style: "currency",
                currency: currency,
                minimumFractionDigits: 2
            }).replace(/\s/g, '');
        }
    };
})

.service('filterService', function() {
    var filters = [{
        'name': 'Price',
        'values': [{
            'name': 'Maximum',
            'display': 'range',
            'value': '100',
            'max': '100'
        }, {
            'name': 'Minimum',
            'display': 'range',
            'value': '0',
            'max': '100'
        }]
    }, {
        'name': 'Discount',
        'values': [{
            'name': 'Minimum',
            'display': 'range',
            'value': '0',
            'max': '100'
        }]
    }, {
        'name': 'Type',
        'values': [{
            'name': 'Game',
            'display': 'toggle',
            'value': true
        }, {
            'name': 'DLC',
            'display': 'toggle',
            'value': true
        }, {
            'name': 'Package',
            'display': 'toggle',
            'value': true
        }, {
            'name': 'Software',
            'display': 'toggle',
            'value': true
        }]
    }, {
        'name': 'Platforms',
        'values': [{
            'name': 'Windows',
            'display': 'toggle',
            'value': true
        }, {
            'name': 'Mac',
            'display': 'toggle',
            'value': true
        }, {
            'name': 'Linux',
            'display': 'toggle',
            'value': true
        }]
    }];

    this.getFilters = function() {
        return filters;
    };

    this.getFilter = function(name) {
        $.each(filters, function(index, filter) {
            console.log(filter.name, name);
            if (filter.name === name) {
                return filter;
            }
        });
    };

    this.getFilterValue = function(filterName, valueName) {
        for (var i = 0, filterLength = filters.length; i < filterLength; i++) {
            if (filters[i].name === filterName) {
                for (var j = 0, valuesLength = filters[i].values.length; j < valuesLength; j++) {
                    if (filters[i].values[j].name === valueName) {
                        return filters[i].values[j].value;
                    }
                }
            }
        }
    };


})

.service('requestService', function($http, $q, $rootScope, $timeout, util) {

    var allAppsOnSale = [];
    var storage_reference = {};

    this.getCurrentApp = function(appId, packageId) {
        var currentApp;
        for (var i = 0; i < allAppsOnSale.length; i++) {
            if (allAppsOnSale[i].appid === appId) {
                currentApp = allAppsOnSale[i];
            }
        }
        if (!currentApp && packageId) {
            for (var j = 0; j < allAppsOnSale.length; j++) {
                if (allAppsOnSale[j].packageid === packageId) {
                    currentApp = allAppsOnSale[j];
                }
            }
        }
        return currentApp;
    };

    //make this function to only use storage, http requests in alarm method
    this.getAllApps = function() {
        var defer = $q.defer(),
            status = 0;

        //get storage reference


        return defer.promise;
    };

    this.getAllAppsOnSale = function() {
        var XHRs = [],
            parent = {},
            currentPage = 1,
            maxPage = 0,
            tmpList = [],
            tmpItems = [],
            allItemsOnSale = [],
            $data,
            allUserTags = [],
            defer = $q.defer(),
            status = 0;

        allAppsOnSale = [];
        // first call to access information like maxPage
        $http.get('http://store.steampowered.com/search/?specials=1')
            .success(function(data) {
                $data = $(data.replace(/<img src=/ig, '<img title='));
                parent = $data.find('#search_result_container');
                maxPage = findLastSalePage($data);
                tmpList = findSaleItems(parent);
                //allUserTags = findAllUserTags($data);

                allAppsOnSale = allAppsOnSale.concat(parseDOMElementList(tmpList, currentPage));
                defer.notify(status);

                currentPage++;
                tmpList = [];
                tmpItems = [];

                //Make all requests j times because steam is buggy like that, ensures all sales are retrieved
                //!TODO observe behaviour in huge sales..
                for (var j = 2; j >= 0; j--) {
                    for (; currentPage <= maxPage; currentPage++) {
                        (function(page) {
                            XHRs.push(
                                $http.get('http://store.steampowered.com/search/?specials=1&page=' + page)
                                .success(
                                    function(data) {
                                        status += 1 / (maxPage*3);
                                        $data = $(data.replace(/<img src=/ig, '<img title='));
                                        parent = $data.find('#search_result_container');
                                        tmpList = findSaleItems(parent);
                                        defer.notify(status);
                                        allAppsOnSale = allAppsOnSale.concat(parseDOMElementList(tmpList, page));

                                        tmpList = [];
                                    })
                            );
                        })(currentPage);

                    }
                    currentPage = 1;
                }

                $q.all(XHRs).then(function() {
                    //console.log("resolve all apps on sale");
                    var newArray = [];
                    var lookupObject = {};

                    for (var k = allAppsOnSale.length - 1; k >= 0; k--) {
                        lookupObject[allAppsOnSale[k]["id"]] = allAppsOnSale[k];
                    }

                    for (var o in lookupObject) {
                        if (lookupObject.hasOwnProperty(o)) {
                            newArray.push(lookupObject[o]);
                        }
                    }
                    defer.notify(1);
                    defer.resolve(newArray);
                });
            });



        // defer.resolve(allItemsOnSale);

        return defer.promise;
    };

    this.getFrontPageDeals = function() {
        var $data,
            defer = $q.defer(),
            dailyDeal = {};

        $http.get('http://store.steampowered.com/?forceMobile=0')
            .success(function(data) {
                $data = $(data.replace(/<img\b[^>]*>/ig, ''));
                // parent = $data.find('#search_result_container');

                dailyDeal = findDailyDeal($data);
                defer.resolve(dailyDeal);
            });

        return defer.promise;
    };

    this.getFeaturedDeals = function() {
        var defer = $q.defer(),
            featuredDeals = [];

        $http.get('http://store.steampowered.com/api/featuredcategories/')
            .success(function(data) {
                featuredDeals = parseFeaturedDeals(data);
                allAppsOnSale = allAppsOnSale.concat(featuredDeals);
                //console.log('allAppsOnSale: ', allAppsOnSale);
                defer.resolve(featuredDeals);
            });

        return defer.promise;
    };

    this.getAppItemDetails = function(appitem) {
        var categories = [],
            description, $data, defer = $q.defer(),
            app, userTags = [];

        //app = this.getCurrentApp(appId, packageId);
        /*console.log("appId: ", appId);
        console.log("packageId: ", packageId);*/
        var id = appitem.id;
        var url = getUrlFromType(appitem, appitem.type);

        //var res = {};

        /*if ($rootScope.storageReference[appitem["type"]][id] && 
            $rootScope.storageReference[appitem["type"]][id]["tags"]) {
            //console.log("Found in storage");
            res[id] = $rootScope.storageReference[appitem.type][id]["tags"];
            defer.resolve(res);
        } else {
            $http.get(url)
                .success(function(data) {
                    $data = $(data);
                    categories = getCategories($data);
                    userTags = getUserTags($data);
                    description = getDescription($data);

                    // defer.resolve({
                    //     'id': id,
                    //     'type': apg.item.type,
                    //     'categories': categories,
                    //     'userTags': userTags,
                    //     'description': description
                    // });
                    $rootScope.storageReference[appitem.type][id].details = {};
                    $rootScope.storageReference[appitem.type][id].details.tags = userTags;
                    $rootScope.storageReference[appitem.type][id].details.categories = categories;
                    $rootScope.storageReference[appitem.type][id].details.description = description;
                    res[id] = userTags;
                    defer.resolve(res);
                });
        }*/


        $http.get(url)
            .success(function(data) {
                $data = $(data);
                categories = getCategories($data);
                userTags = getUserTags($data);
                description = getDescription($data);

                // defer.resolve({
                //     'id': id,
                //     'type': appitem.type,
                //     'categories': categories,
                //     'userTags': userTags,
                //     'description': description
                // });
                var details = {
                    tags: userTags,
                    categories: categories,
                    description: description
                };
                /*res[id] = userTags;
                defer.resolve(res);*/
                defer.resolve(details);
            });

        return defer.promise;

        function getUrlFromType(appitem, type) {
            if (type === 'app') {
                return 'http://store.steampowered.com/apphover/' + appitem.appid;
            } else if (type === 'package') {
                return 'http://store.steampowered.com/subhover/' + appitem.packageid;
            } else if (type === 'bundle') {
                return 'http://store.steampowered.com/bundle/' + appitem.bundleid + '/hover_public/';
            }
        }
    };

    this.getMetaScore = function(appId, packageId) {
        var metaScore, app, windows, linux, mac, defer = $q.defer();
        app = this.getCurrentApp(appId, packageId);
        if (app && app.appid) {
            $http.get('http://store.steampowered.com/api/appdetails/?appids=' + appId + '&filters=metacritic,platforms')
                .success(function(data) {
                    console.log('platforms: ', data[appId].data.platforms);
                    if (data[appId].data) {
                        if (data[appId].data.metacritic) {
                            metaScore = data[appId].data.metacritic.score;
                        } else {
                            metaScore = 0;
                        }
                        if (data[appId].data.platforms) {
                            windows = data[appId].data.platforms.windows;
                            mac = data[appId].data.platforms.mac;
                            linux = data[appId].data.platforms.linux;
                        } else {
                            windows = true;
                            linux = false;
                            mac = false;
                        }
                        defer.resolve({
                            'metaScore': metaScore,
                            'windows': windows,
                            'mac': mac,
                            'linux': linux
                        });
                    }
                });
        } else {
            $http.get('http://store.steampowered.com/api/packagedetails/?packageids=' + packageId + '&filters=platforms')
                .success(function(data) {
                    if (data[packageId].data.platforms) {
                        windows = data[packageId].data.platforms.windows;
                        mac = data[packageId].data.platforms.mac;
                        linux = data[packageId].data.platforms.linux;
                    } else {
                        windows = true;
                        linux = false;
                        mac = false;
                    }
                    metaScore = 0;
                    defer.resolve({
                        'metaScore': metaScore,
                        'windows': windows,
                        'mac': mac,
                        'linux': linux
                    });
                });
        }
        return defer.promise;
    };

    this.getAllUserTags = function() {
        var XHRs = [],
            defer = $q.defer(),
            ctr = 0,
            tmp_results = [],
            all_results = {};

        for (var i = 0, len = allAppsOnSale.length; i < len; i++) {
            XHRs.push(
                this.getAppItemDetails(allAppsOnSale[i])
                .then(thenCallback)
            );
        }

        function thenCallback(data) {
            //get the key, which is the id, to access the object
            all_results[Object.keys(data)[0]] = data[Object.keys(data)[0]];
        }

        $q.all(XHRs).then(function() {
            //console.log("resolve all tags");
            //console.log("Saving tags in local storage: ", storage_reference);
            //chrome.storage.local.set($rootScope.storageReference);
            defer.resolve(all_results);
        });

        return defer.promise;
    };

    //private functions

    var getDescription = function(parent) {
        //console.log('description: ', parent.find('#hover_desc').html());
        return parent.find('#hover_desc').html();
    };

    var getUserTags = function(parent) {
        var userTags = [],
            bestTags = [],
            i = 0;
        try {
            var gt = parent.find('.app_tag');
            $.each(gt, function(key, el) {
                var $el = $(el);
                var tag = $el.html();
                userTags.push(tag.replace(/&amp;/g, '&'));
            });
            while (i < 6 && userTags[i] !== undefined) {
                bestTags.push(userTags[i]);
                i++;
            }
            //console.log('UserTags: ', userTags);
            //console.log('bestTags: ', bestTags);

        } catch (e) {
            bestTags.push(' - ');
        }
        return bestTags;
    };

    var getCategories = function(parent) {
        var categories = [],
            doublie = false;
        try {
            var gt = parent.find('.hover_category_icon');
            $.each(gt, function(key, el) {
                var $el = $(el);
                var src = $el.find('img').attr('src');
                for (var i = 0; i < categories.length; i++) {
                    if (categories[i] === src) {
                        doublie = true;
                    }
                }
                if (doublie === false) {
                    categories.push(src);
                }
            });
        } catch (el) {

        }
        return categories;
    };

    var findLastSalePage = function(parent) {
        return parent.find('.pagebtn').prev().html();
    };

    var findSaleItems = function(parent) {
        return parent.find('.search_rule').next().children('a');
    };

    var findAllUserTags = function(parent) {
        var tagArray = [],
            tagElements;
        try {
            tagElements = parent.find('#TagFilter_Container .tab_filter_control');
            $.each(tagElements, function(key, el) {
                tagArray.push($(el).data('loc'));
            });
        } catch (el) {

        }

        return tagArray;
    };

    var parseDOMElementList = function(list, page) {
        var appitems = [],
            appitem = {},
            relevanceCounter = 1;

        $.each(list, function(key, el) {
            var $el = $(el),
                urcText = getUserReviewScoreText($el),
                urcPattern = /\d+\s?%/g,
                id = "";

            appitem.appid = getAppId($el);
            appitem.packageid = getPackageId($el);
            appitem.bundleid = getBundleId($el);
            appitem.bundledata = getBundleData($el);
            appitem.name = getName($el).replace(/&amp;/g, '&');
            appitem.released = getReleaseDate($el);
            appitem.relevance = (page - 1) * list.length + relevanceCounter;
            appitem.page = page;

            appitem.price = {};
            appitem.price.original = getOriginalPrice($el);
            appitem.price.final = getFinalPrice($el);
            appitem.price.finalsize = parseFloat(getFinalPrice($el).replace(",", "."));
            appitem.price.discount = getDiscount($el, appitem.bundledata);

            appitem.urc = {};
            appitem.urc.score = getUrcScore(urcText);
            appitem.urc.class = getUserReviewScoreClass($el);

            appitem.imageUrl = getAppImage($el);
            appitem.url = getUrl($el);
            appitem.type = getType(appitem.appid, appitem.packageid, appitem.bundleid);

            if (urcText) {
                appitem.urc.percent = urcPattern.exec(urcText)[0];
                appitem.urc.text = urcText.replace(/<br>/ig, ': ');
            }
            appitem.id = getIdFromType(appitem, appitem.type);

            appitems.push(appitem);
            appitem = {};
            relevanceCounter += 1;
        });

        return appitems;

        function getAppId(element) {
            var appid = element.data('dsAppid');
            return appid ? appid.toString() : undefined;
        }

        function getUrl(element) {
            return element.attr('href');
        }

        function getPackageId(element) {
            var pid = element.data('dsPackageid');
            // if (pid === undefined) {
            //       //console.log("UNDEFINED pid", element);
            //   }
            //   else {
            //       console.log("DEFINED pid", element);
            //   }
            return pid ? pid.toString() : undefined;
        }

        function getBundleId(element) {
            var bid = element.data('dsBundleid');
            return bid ? bid.toString() : undefined;
        }

        function getBundleData(element) {
            var bdata = element.data('dsBundleData');
            var data;
            try {
                data = JSON.parse(bdata);
            } catch (err) {
                data = bdata;
            }
            return data;
        }

        function getName(element) {
            return element.find('.title').html();
        }

        function getReleaseDate(element) {
            return element.find('.search_released').html();
        }

        function getOriginalPrice(element) {
            return element.find('strike').html();
        }

        function getFinalPrice(element) {
            var priceEl = element.find('.search_price');
            // if (priceEl.hasClass('discounted')) {
            return priceEl.contents()
                .filter(function() {
                    return this.nodeType === Node.TEXT_NODE;
                }).last().text();
            // }
            // else {
            //     return priceEl.
            // }

        }

        function getDiscount(element, bundleData) {
            if (bundleData && bundleData.m_nDiscountPct > 0) {
                return parseInt(bundleData.m_nDiscountPct | 0);
            }
            var discount = parseInt(element.find('.search_discount span').text().replace(/\-|\%/g, ''));
            return discount ? discount : 0;
        }

        function getAppImage(element) {
            //return "http://cdn.akamai.steamstatic.com/steam/apps/" + appid + "/capsule_184x69.jpg";
            return element.find('.search_capsule img').attr("title");
        }

        function getPackageImage(element) {
            //return "http://cdn.akamai.steamstatic.com/steam/subs/" + packageid + "/capsule_sm_120.jpg";
            return element.find('.search_capsule img').title();
        }

        function getBundleImage(element) {
            //return "http://cdn.akamai.steamstatic.com/steam/subs/" + packageid + "/capsule_sm_120.jpg";
            return element.find('.search_capsule img').title();
        }

        function getUserReviewScoreClass(element) {
            var el = element.find('.search_reviewscore span');

            if (el.hasClass('positive')) {
                return 'positive';
            } else if (el.hasClass('positive')) {
                return 'mixed';
            } else if (el.hasClass('negative')) {
                return 'negative';
            }
        }

        function getIdFromType(appitem, type) {
            if (type === 'app') {
                return appitem.appid;
            } else if (type === 'package') {
                return appitem.packageid;
            } else if (type === 'bundle') {
                return appitem.bundleid;
            }
        }

        function getUserReviewScoreText(element) {
            return element.find('.search_reviewscore span').data('storeTooltip');
        }

        function getUrcScore(str) {
            if (str === undefined) {
                return 0;
            }

            var urcPercent = findUrcPercent(str),
                urcCount = findUrcCount(str.replace(/\d+\s?%/g, ''));

            //return 1 - (urcPercent - (1 - urcPercent)) * urcCount;
            return (50 - urcPercent) * urcCount;

            function findUrcPercent(str) {
                var pattern = /\d+\s?%/g;
                var res = parseInt(pattern.exec(str)[0].replace(/\s?%/g, ''));
                return res ? res : 0;
            }

            function findUrcCount(str) {
                var pattern = /\d+(,)?(\d+)?/g,
                    result = pattern.exec(str);
                if (result !== null) {
                    return parseInt(result[0].replace(',', ''));
                } else {
                    return 0;
                }
            }
        }

        function getType(appid, packageid, bundleid) {
            if (appid && !packageid) {
                return 'app';
            } else if (packageid) {
                return 'package';
            } else if (bundleid) {
                return 'bundle';
            } else {
                return 'app';
            }
        }
    };

    var findDailyDeal = function(page) {
        var parent = page.find('.dailydeal_ctn'),
            dealitem = {};

        //console.log(parent, page);
        // dealitem.name = getName(parent);
        dealitem.appid = getAppId(parent);
        dealitem.packageid = getPackageId(parent);
        dealitem.originalprice = getOriginalPrice(parent);
        dealitem.finalprice = getFinalPrice(parent);
        dealitem.finalpricesize = parseFloat(getFinalPrice(parent).replace(",", "."));
        dealitem.discount = getDiscountPercent(parent);
        dealitem.timeremaining = getTimeRemaining(parent);

        return dealitem;

        function getAppId(parent) {
            return parent.find('.dailydeal_cap').data('dsAppid').toString();
        }

        function getPackageId(parent) {
            var pid = parent.find('dailydeal_cap').data('dsPackageid');

            return pid ? pid.toString() : undefined;
        }

        function getOriginalPrice(parent) {
            return parent.find('.discount_original_price').html();
        }

        function getFinalPrice(parent) {
            return parent.find('.discount_final_price').html();
        }

        function getDiscountPercent(parent) {
            return parent.find('.discount_pct').html();
        }

        function getTimeRemaining(parent) {
            return parent.find('.dailydeal_countdown').html();
        }
    };

    var parseFeaturedDeals = function(json) {
        var featuredDeals = [];

        if (json.specials && json.specials.items) {
            $.each(json.specials.items, function(key, el) {
                var deal = {};

                if (el.discounted) {
                    if (el.type === 0) {
                        deal.appid = parseInt(el.id);
                        deal.packageid = null;
                    } else if (el.type === 1) {
                        deal.packageid = parseInt(el.id);
                        deal.appid = null;
                    }
                    deal.name = el.name;
                    this.finalpricesize = el.final_price;
                    deal.originalprice = util.formatPrice(el.original_price, el.currency);
                    deal.finalprice = util.formatPrice(el.final_price, el.currency);
                    deal.discount = "-" + el.discount_percent + "%";
                    deal.imageUrl = el.large_capsule_image;
                    deal.currency = el.currency;
                    deal.platforms = {
                        windows: el.windows_available,
                        mac: el.mac_available,
                        linux: el.linux_available,
                    };


                    featuredDeals.push(deal);
                }

            });
        }

        return featuredDeals;
    };
});