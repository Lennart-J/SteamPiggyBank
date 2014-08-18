var appIds = [],
  appIds_discount = [],
  appIds_discount_detailed = [],
  XHRs = [],
  CHUNK_SIZE = 200,
  appIds_discount_appids = [],
  appIds_discount_type = [],
  appIds_discount_name = [],
  appIds_discount_controller = [],
  appIds_discount_platforms = [],
  appIds_discount_categories = [],
  appIds_discount_genres = [],
  appIds_discount_price = [];

var getAllApps = function(callback) {
  console.info("Performing requests.");

  $.ajax({
    url: "http://api.steampowered.com/ISteamApps/GetAppList/v2",
    type: "GET",
    accepts: "application/json",
    retryLimit: 3
  })
    .done(function(response) {
      $.each(response.applist.apps, function(index, value) {
        appIds.push(value.appid);
      });
      //console.log(response.applist.apps);
      console.log(appIds);
      if (callback !== 'undefined') callback();
    });
};

var getAppDetails = function(appIds, urlParams) {
  return $.ajax({
    url: "http://store.steampowered.com/api/appdetails/?appids=" + appIds.toString() + urlParams,
    type: "GET",
    accepts: "application/json",
    statusCode: {
      200: function(data, textStatus, jqXHR) {
        $.each(data, function(key, value) {
          if (value.success === true && !$.isArray(value.data)) {
            if (urlParams.indexOf("filters=price_overview") > -1) {
              if (value.data.price_overview.discount_percent !== 0) {
                appIds_discount.push(key);
              }
            } else {
              appIds_discount_detailed.push({
                appid: value.data.steam_appid,
                type: value.data.type,
                name: value.data.name,
                metacritic : value.data.metacritic,
                recommendations: value.data.recommendations, //optional
                controller_support: value.data.controller_support,
                platforms: value.data.platforms,
                categories: value.data.categories,
                genres: value.data.genres,
                price_overview: value.data.price_overview
              });
            }
          }
        });
        if (urlParams.indexOf("filters=price_overview") > -1) {
          console.log(appIds_discount, appIds_discount.length);
        } else {
          console.log(appIds_discount_detailed, appIds_discount_detailed.length);
        }
      },
      500: function(jqXHR, textStatus, errorThrown) {
        /*console.warn("RETRYING REQUEST");
        setTimeout(function() {
          getAppDetails(appIds);
        }, 5000);*/
      }
    }
  });
};

var processAppDetails = function() {
  var chunkCount = Math.floor(appIds.length / CHUNK_SIZE),
    appIds_chunk = 0;

  var benchmark_begin,
    benchmark_end,
    benchmark = 0;

  benchmark_begin = Date.now();

  for (var i = 0; i <= chunkCount; i++) {
    appIds_chunk = makeChunk(appIds);
    XHRs.push(getAppDetails(appIds_chunk, "&cc=EE&l=english&filters=price_overview"));
  }
  //not needed because i <= chunkCount
  //XHRs.push(getAppDetails(appIds, "&cc=EE&l=english&filters=price_overview"));

  var defer = $.when.apply($, XHRs);
  defer.done(function() {
    benchmark_end = Date.now();
    console.log((benchmark_end - benchmark_begin) / 1000);
    //TODO ready to continue :)
    var today = new Date();
    //graceperiod so storage sets 
    setTimeout(function() {
      chrome.storage.local.set({
        //Remember last poll to steam api
        'lastAppListPoll': today.toString(),
        'discounted_apps': appIds_discount
      }, function() {
        console.info('commited in storage');
        //empty Ajax array
        XHRs = [];
        chrome.storage.local.getBytesInUse(['discounted_apps'], function(res) {
          console.log(res);
        });
        processDiscountedAppDetails();
      });
    }, 1000);
  });
};

function makeChunk(sourceArray) {
  return sourceArray.splice(0, CHUNK_SIZE);
}

var processDiscountedAppDetails = function() {
  //CHUNK_SIZE set lower to ensure success
  CHUNK_SIZE = 50;
  var chunkCount = Math.floor(appIds_discount.length / CHUNK_SIZE),
    appIds_chunk = 0;

  for (var i = 0; i <= chunkCount; i++) {
    appIds_chunk = makeChunk(appIds_discount);
    XHRs.push(getAppDetails(appIds_chunk, "&cc=EE&l=english"));
  }
  //XHRs.push(getAppDetails(appIds_discount, "&cc=DE&l=english"));
  var defer = $.when.apply($, XHRs);
  defer.done(function() {
    //TODO ready to continue :)
    //graceperiod so storage sets 
    setTimeout(function() {
      chrome.storage.local.set({
        'discounted_apps_detailed': appIds_discount_detailed
        //Remember last poll to steam api
        //'discounted_type': appIds_discount,
        //'discount_name': appIds_discount_name,
        // 'discount_controller': appIds_discount_controller,
        //'discount_platforms': appIds_discount_platforms,
        //'discount_categories': appIds_discount_categories,
        //'discount_genres': appIds_discount_genres,
        //'discount_price': appIds_discount_price
      }, function() {
        console.info('commited in storage');
        chrome.storage.local.getBytesInUse(['discounted_apps_detailed'], function(res) {
          console.log("Bytes in Use discounted_apps_detailed " + res);
        });
        //empty Ajax array
        XHRs = [];
      });
    }, 1000);
  });
};

//Immediate initialization function called on browser start, i.e. when bg script is initialized
(function() {
  console.info('init');

  chrome.storage.local.get(['lastAppListPoll'], function(items) {
    if (items.lastAppListPoll) {
      //could also set both dates to date.setHours(0,0,0,0) - i.e. steam sale update time of day
      var storedDate = new Date(items.lastAppListPoll),
        diff = new Date() - storedDate;

      console.log(storedDate);
      console.log(new Date());
      console.log(diff);
      var dayDiff = Math.floor(diff / (1000 * 60 * 60 * 24));

      console.warn("DEBUG - OVERWRITING dayDiff");
      dayDiff = 5;
      if (dayDiff > 0) {
        getAllApps(processAppDetails);
      } else {
        console.info("Less than one day has passed since last update.");
      }
    } else {
      //no date in storage found
      console.info("No lastAppListPoll parameter found in storage.");
      getAllApps(processAppDetails);
    }
  });

})();