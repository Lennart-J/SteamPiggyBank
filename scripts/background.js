var appIds = [],
  appIds_discount = [],
  XHRs = [],
  CHUNK_SIZE = 200;

var getAllApps = function(callback) {
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

var getAppDetails = function(appIds) {
  return $.ajax({
    url: "http://store.steampowered.com/api/appdetails/?appids=" + appIds.toString() + "&cc=DE&l=english&filters=price_overview",
    type: "GET",
    accepts: "application/json",
    statusCode: {
      200: function(data, textStatus, jqXHR) {
        $.each(data, function(key, value) {
          if (value.success === true && !$.isArray(value.data)) {
            if (value.data.price_overview.discount_percent !== 0) {
              appIds_discount.push(key);
            }
          }
        });
        console.log(appIds_discount, appIds_discount.length);
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
    XHRs.push(getAppDetails(appIds_chunk));
  }

  XHRs.push(getAppDetails(appIds));

  var defer = $.when.apply($, XHRs);
  defer.done(function() {
    benchmark_end = Date.now();
    console.log((benchmark_end - benchmark_begin) / 1000);
    //TODO ready to continue :)
    var today = new Date();
    //graceperiod so storage sets 
    setTimeout(function(){
      chrome.storage.sync.set({
        //Remember last poll to steam api
        'lastAppListPoll': today.toString(),
        'discounted_apps': appIds_discount
      }, function() {
        console.info('commited in storage');
         chrome.runtime.sendMessage({'poll':'complete'});
      });
    }, 1000);
  });
};

function makeChunk(sourceArray) {
  return sourceArray.splice(0, CHUNK_SIZE);
}

//Immediate initialization function called on browser start, i.e. when bg script is initialized
(function() {
  console.info('init');

  chrome.storage.sync.get(['lastAppListPoll'], function(item) {
    console.log(item);
  });
  getAllApps(processAppDetails);
})();