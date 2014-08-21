var appIds = [],
  appIds_discount = [],
  appIds_discount_detailed = [],
  XHRs = [],
  CHUNK_SIZE = 200,
  XHRsinProgress = false;

//usually triggered when Chrome makes an update check
// -triggered by requestUpdateCheck AND Chromes automatic update mechanism
chrome.runtime.onUpdateAvailable.addListener(function(details) {
  console.log("updating to version " + details.version);
  //UNLOADS POPUP
  chrome.runtime.reload();
});
//Force update check when background script is loaded
// -at the moment on browser start
chrome.runtime.requestUpdateCheck(function(status) {
  console.info("requestUpdateCheck result: ", status);
});

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
    XHRs.push(getAppDetails(appIds_chunk, "&cc=DE&l=english&filters=price_overview"));
  }
  //not needed because i <= chunkCount
  //XHRs.push(getAppDetails(appIds, "&cc=EE&l=english&filters=price_overview"));

  var defer = $.when.apply($, XHRs);
  defer.done(function() {
    benchmark_end = Date.now();
    console.log((benchmark_end - benchmark_begin) / 1000);
    //TODO ready to continue :)
    var todayUTC = new Date(new Date().toUTCString().substr(0, 25));
    if (todayUTC.getHours() < 17) {
      //1 day back
      todayUTC.setDate(todayUTC.getDate() - 1);
    }
    todayUTC.setHours(17, 1, 0, 0);
    //graceperiod so storage sets 
    setTimeout(function() {
      chrome.storage.local.set({
        //Remember last poll to steam api
        'lastAppListPoll': todayUTC.toString(),
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
    XHRs.push(getAppDetails(appIds_chunk, "&cc=DE&l=english"));
  }
  //XHRs.push(getAppDetails(appIds_discount, "&cc=DE&l=english"));
  var defer = $.when.apply($, XHRs);
  defer.done(function() {
    //graceperiod so storage sets 
    setTimeout(function() {
      chrome.storage.local.set({
        'discounted_apps_detailed': appIds_discount_detailed
      }, function() {
        console.info('commited in storage');
        chrome.storage.local.getBytesInUse(['discounted_apps_detailed'], function(res) {
          console.log("Bytes in Use discounted_apps_detailed " + res);
        });
        //empty Ajax array
        XHRs = [];
        //stop badge animation
        XHRsinProgress = false;
        displayProgressInBadge_End();
      });
    }, 1000);
  });
};

function displayProgressInBadge() {

  chrome.browserAction.getBadgeText({}, function(result) {
    var newBadgeText = '';

    if ((result === '.  ' || result === '.. ' || result === '...') && XHRsinProgress) {
      if (result === '.  ') {
        newBadgeText = '.. ';
      } else if (result === '.. ') {
        newBadgeText = '...';
      } else if (result === '...') {
        newBadgeText = '.  ';
      }
    } else {
      return false;
    }
    chrome.browserAction.setBadgeText({
      text: newBadgeText
    });
    setTimeout(displayProgressInBadge, 500);
  });
}

function displayProgressInBadge_Start() {
  chrome.browserAction.setBadgeBackgroundColor({
    color: "#3366CC"
  });
  chrome.browserAction.setBadgeText({
    text: '.  '
  });

  displayProgressInBadge();
}

function displayProgressInBadge_End() {
  chrome.browserAction.setBadgeText({
    text: 'Ok'
  });
  setTimeout(function() {
    chrome.browserAction.setBadgeText({
      text: ''
    });
  }, 2000);
}
//Immediate initialization function called on browser start, i.e. when bg script is initialized
(function() {
  console.info('init');

  chrome.storage.local.get(['lastAppListPoll'], function(items) {
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
        displayProgressInBadge_Start();

        getAllApps(processAppDetails);
      } else {
        console.info("Less than one day has passed since last update.");
      }
    } else {
      XHRsinProgress = true;
      displayProgressInBadge_Start();
      //no date in storage found
      console.info("No lastAppListPoll parameter found in storage.");
      getAllApps(processAppDetails);
    }
  });
})();
