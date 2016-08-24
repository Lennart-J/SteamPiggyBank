'use strict';
var app = angular.module('background', ['background.controllers', 'background.services']);

app.run(function($rootScope) {
    chrome.storage.local.get(null, function(items) {
        if (items && items.app) {
            //console.log("Got storage reference")
            $rootScope.storageReference = items;

            //cleanup
            $.each($rootScope.storageReference, function(type, elements) {
                if ($.inArray(type, ["app", "bundle", "package"]) !== -1) {
                    $.each(elements, function(id, details) {
                        if ($.isArray(details)) {
                            console.log("delete entry");
                            delete $rootScope.storageReference[type][id];
                        }
                    });
                }
            });

        } else {
            $rootScope.storageReference = {
                'bundle': {
                    '0': {
                        appid: 0,
                        packageid: 0,
                        bundleid: 0,
                        bundledata: 0,
                        name: "yay",
                        released: "2016",
                        price: {
                            original: "10€",
                            final: "7,50€",
                            finalsize: 7.50,
                            discount: "25%"
                        },
                        urc: {
                            score: 50,
                            class: "positive",
                            percent: "80%",
                            text: "......"
                        },
                        imageUrl: "store.etc",
                        url: "store.etcpp",
                        type: "app",
                        details: {
                            tags: ["asd", "asb"],
                            description: "blah",
                            categories: ["Controller", "Singleplayer"]
                        }
                    }
                },
                'app': {
                    '0': ['great', 'awesome']
                },
                'package': {
                    '0': ['great', 'awesome']
                }
            };
        }
    });
});