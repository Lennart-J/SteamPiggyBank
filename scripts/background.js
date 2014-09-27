(function() {
  "use strict";

  var appIds = [],
    appIdsLength = 0,
    appIds_discount = [],
    appIds_discount_detailed = [],
    packageIds_discount = [],
    packageIds_discount_detailed = [];
  var XHRs = {
      appFiltered: [],
      appDetails: [],
      packageDetails: []
    },
    CHUNK_SIZE = 200,
    XHRsinProgress = false,
    retrievedCountryCode = false;

  chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === "update") {
      if (!XHRsinProgress) {
        XHRsinProgress = true;
        //displayProgressInBadge_Start();
        //performing requests
        console.info("Extension updated.");
        getAllApps(processAppDetails);
      }
    }
  });
  //Force update check when background script is loaded
  // -at the moment on browser start
  chrome.runtime.onStartup.addListener(function() {
    chrome.runtime.requestUpdateCheck(function(status) {
      console.info("requestUpdateCheck result: ", status);
    });
  });


  var getAllApps = function(callback) {
    console.info("Performing app requests.");
    chrome.storage.local.set({
      "status": 0
    });
    $.ajax({
      url: "http://api.steampowered.com/ISteamApps/GetAppList/v2",
      type: "GET",
      accepts: "application/json"
    })
      .done(function(response) {
        $.each(response.applist.apps, function(index, value) {
          appIds.push(value.appid);
        });
        //console.log(response.applist.apps);
        console.log(appIds);
        appIds.reverse();
        appIdsLength = appIds.length;
        if (callback !== "undefined") callback();
      });
  };

  var getAppDetails = function(appIds, urlParams) {
    if (appIds === "") return;
    return $.ajax({
      url: "http://store.steampowered.com/api/appdetails/?appids=" + appIds.toString() + urlParams,
      type: "GET",
      accepts: "application/json",
      statusCode: {
        200: function(data) {
          $.each(data, function(key, value) {
            if (value.success === true && !$.isArray(value.data) && value.data.package_groups.length > 0) {
              if (urlParams.indexOf("filters=price_overview") > -1) {
                if (value.data.price_overview && (value.data.price_overview.initial / value.data.price_overview.final) > 1) {
                  appIds_discount.push(key);
                  if ((value.data.price_overview.initial / value.data.price_overview.final) > 1 && value.data.price_overview.discount_percent === 0) {
                    console.warn("discount_percent wrong", value.data);
                  }
                  //getting packages of discounted apps
                  if (value.data.packages) {
                    $.each(value.data.packages, function(key, value) {
                      packageIds_discount.push(value);
                    });
                  }
                }
              } else {
                //Steam miscalculation...
                if (value.data.price_overview.discount_percent === 0) {
                  value.data.price_overview.discount_percent = ((value.data.price_overview.final / value.data.price_overview.initial).toFixed(2) - 1) * 100;
                }
                appIds_discount_detailed.push({
                  appid: value.data.steam_appid.toString(),
                  type: value.data.type,
                  name: value.data.name,
                  price_overview: value.data.price_overview,
                  categories: value.data.categories,
                  genres: value.data.genres,
                  platforms: value.data.platforms,
                  metacritic: value.data.metacritic,
                  recommendations: value.data.recommendations, //optional
                  controller_support: value.data.controller_support
                });
              }
            }
          });
          if (urlParams.indexOf("filters=price_overview") > -1) {
            console.log(appIds_discount, appIds_discount.length);
          } else {
            console.log(appIds_discount_detailed, appIds_discount_detailed.length);
          }
        }
      }
    });
  };

  function parseSteamLocaleCookie() {
    console.info("getSteamLocaleCookie");
    chrome.cookies.getAll({
      "domain": "store.steampowered.com"
    }, function(cookies) {
      var cc = "";
      $.each(cookies, function(key, element) {
        if (element.name && element.name.indexOf("steamCC") === 0) {
          console.info("getSteamLocaleCookie: " + element.value);
          cc = element.value;
          retrievedCountryCode = true;
        }
        //WARNING disable for debugging
        else if (element.name === "fakeCC") {
          console.info("getSteamLocaleCookie (fake): " + element.value);
          console.log("Got fake CC...");
          cc = element.value;
          retrievedCountryCode = true;
          return false;
        } else {
          retrievedCountryCode = false;
        }
      });

      if (retrievedCountryCode) {
        chrome.storage.local.set({
          "countryCode": cc
        }, function() {
          retrievedCountryCode = true;
        });
      }
    });
  }

  var getPackageDetails = function(packageIds) {
    if (packageIds === "") return;
    return $.ajax({
      url: "http://store.steampowered.com/api/packagedetails/?packageids=" + packageIds.toString(),
      type: "GET",
      accepts: "application/json",
      statusCode: {
        200: function(data) {
          $.each(data, function(key, value) {
            //TODO get Multi Packages (apps.length === 1)
            if (value.success === true && !$.isArray(value.data) && value.data.apps && value.data.apps.length > 1) {

              packageIds_discount_detailed.push({
                packageid: key.toString(),
                name: value.data.name,
                price: value.data.price,
                apps: value.data.apps,
              });
            }
          });
          console.log(packageIds_discount_detailed, packageIds_discount_detailed.length);
        }
      }
    });
  };

  var processAppDetails = function() {
    makeBadgeRequest();

    var defer = $.when.apply($, XHRs.appFiltered);
    defer.done(function() {
      //ready to continue :)
      var todayUTC = new Date(new Date().toUTCString().substr(0, 25));
      if (todayUTC.getHours() < 17) {
        //1 day back
        todayUTC.setDate(todayUTC.getDate() - 1);
      }
      todayUTC.setHours(17, 1, 0, 0);
      //graceperiod so storage sets 
      setTimeout(function() {
        appIds_discount = removeDuplicates(appIds_discount);
        packageIds_discount = removeDuplicates(packageIds_discount);
        chrome.storage.local.set({
          //Remember last poll to steam api
          "lastAppListPoll": todayUTC.toString(),
          // "discounted_apps": appIds_discount,
          // "discounted_packages": packageIds_discount
        }, function() {
          console.info("commited in storage");
          //empty Ajax array
          XHRs.appFiltered = [];
          /*chrome.storage.local.getBytesInUse(["discounted_apps"], function(res) {
            console.log(res);
          });*/
          processDiscountedAppDetails(appIds_discount);
          if (appIds.length > 0) {
            processAppDetails();
          }
        });
      }, 1000);
    });
  };

  function makeBadgeRequest() {
    var appIds_chunk = 0,
      p = ((appIdsLength - appIds.length) + 1) / appIdsLength,
      chunkCount = Math.floor(appIdsLength / CHUNK_SIZE);

    chunkCount = chunkCount * p;
    console.warn("appIds.length: " + appIds.length, "appIdsTotalLength: " + appIdsLength);
    console.warn("P: " + p, "chunkCount: " + chunkCount);
    for (var i = 0; i <= chunkCount; i++) {
      appIds_chunk = makeChunk(appIds);
      if (appIds_chunk.length > 0) {
        XHRs.appFiltered.push(getAppDetails(appIds_chunk, "&filters=price_overview,packages"));
      }
    }
  }

  function makeChunk(sourceArray) {
    return sourceArray.splice(0, CHUNK_SIZE);
  }

  function removeDuplicates(sourceArray) {
    var uniques = [];

    $.each(sourceArray, function(sourceIndex, sourceElement) {
      $.each(uniques, function(uniquesIndex, uniquesElement) {
        if (sourceElement === uniquesElement) {
          // console.log("Found duplicate app/package ", uniquesElement, sourceElement);
          uniques.splice(uniquesIndex, 1);
          return false;
        }
      });
      uniques.push(sourceElement);
    });

    return uniques;
  }

  function removeDuplicatesById(sourceArray, id) {
    var uniques = [];

    $.each(sourceArray, function(sourceIndex, sourceElement) {
      $.each(uniques, function(uniquesIndex, uniquesElement) {
        if (sourceElement[id].toString() === uniquesElement[id].toString()) {
          // console.log("Found duplicate " + id, uniquesElement, sourceElement);
          uniques.splice(uniquesIndex, 1);
          return false;
        }
      });
      uniques.push(sourceElement);
    });

    return uniques;
  }

  var processDiscountedAppDetails = function(discountedAppIds) {
    //CHUNK_SIZE set lower to ensure success
    var CHUNK_SIZE = 50;
    var appsChunkCount = Math.floor(discountedAppIds.length / CHUNK_SIZE),
      packagesChunkCount = Math.floor(packageIds_discount.length / CHUNK_SIZE),
      appIds_chunk = 0,
      packageIds_chunk = 0;

    for (var i = 0; i <= appsChunkCount; i++) {
      appIds_chunk = makeChunk(discountedAppIds);
      XHRs.appDetails.push(getAppDetails(appIds_chunk, ""));
    }
    for (i = 0; i <= packagesChunkCount; i++) {
      packageIds_chunk = makeChunk(packageIds_discount);
      XHRs.packageDetails.push(getPackageDetails(packageIds_chunk));
    }
    //XHRs.push(getAppDetails(appIds_discount, "&cc=DE&l=english"));
    var defer = $.when.apply($, XHRs.appDetails);
    defer.done(function() {
      //graceperiod so storage sets 
      setTimeout(function() {
        var appIds_total = [],
          packageIds_total = [];

        //appIds_discount_detailed = removeDuplicatesById(appIds_discount_detailed, "appid");
        //packageIds_discount_detailed = removeDuplicatesById(packageIds_discount_detailed, "packageid");
        console.log("appIds_discount_detailed Length: " + appIds_discount_detailed.length);
        console.log("packageIds_discount_detailed Length: " + packageIds_discount_detailed.length);
        chrome.storage.local.get(["discounted_apps_detailed", "discounted_packages_detailed"], function(items) {
          if (items.discounted_apps_detailed) {
            appIds_total = removeDuplicatesById(appIds_discount_detailed.concat(items.discounted_apps_detailed), "appid");
          } else {
            appIds_total = removeDuplicatesById(appIds_discount_detailed, "appid");
          }

          if (items.discounted_packages_detailed) {
            packageIds_total = removeDuplicatesById(packageIds_discount_detailed.concat(items.discounted_packages_detailed), "packageid");
          } else {
            packageIds_total = removeDuplicatesById(packageIds_discount_detailed, "packageid");
          }
          chrome.storage.local.set({
            "discounted_apps_detailed": appIds_total,
            "discounted_packages_detailed": packageIds_total,
            "status": ((appIdsLength - appIds.length) / appIdsLength)
          }, function() {
            console.info("commited in storage");
            chrome.runtime.sendMessage({
              status: (appIdsLength - appIds.length) / appIdsLength
            });
            //empty Ajax array
            XHRs.appDetails = [];
            //stop badge animation
            XHRsinProgress = false;
          });
        });
      }, 1000);
    });
  };

  //Immediate initialization function called on browser start, i.e. when bg script is initialized
  (function() {
    console.info("init");

    console.log("XHRsinProgress: " + XHRsinProgress);
    if (!XHRsinProgress) {
      chrome.storage.local.get(["countryCode", "lastAppListPoll"], function(items) {
        /*if (items.countryCode) {
          retrievedCountryCode = true;
        }*/
        if (items.lastAppListPoll) {
          //Steam update time set to 17:01 UTC
          var storedDate = new Date(items.lastAppListPoll),
            today = new Date(new Date().toUTCString().substr(0, 25)),
            diff = today - storedDate;

          console.log("storedDate(UTC): ", storedDate);
          console.log("today(UTC): ", today);
          console.log(diff, "today gt storedDate: ", today > storedDate, "today lt storedDate: ", today < storedDate);
          var dayDiff = Math.floor(diff / (1000 * 60 * 60 * 24));

          /*console.warn("DEBUG - OVERWRITING dayDiff");
        dayDiff = 5;*/
          if (dayDiff > 0) {
            XHRsinProgress = true;

            getAllApps(processAppDetails);
          } else {
            console.info("Less than one day has passed since last update.");
          }
        } else {
          XHRsinProgress = true;
          //no date in storage found
          console.info("No lastAppListPoll parameter found in storage.");
          getAllApps(processAppDetails);
        }
      });
    }
  })();
}());