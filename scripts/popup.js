var appIds = [],
  appIds_discount = [],
  XHRs = [],
  CHUNK_SIZE = 200;

var getAllApps = function() {
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
    });
};

var getAppDetailsAjaxCall = function(appIds) {
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
          getAppDetailsAjaxCall(appIds);
        }, 5000);*/

      }
    }
  });
};

var getAppDetails = function() {
  var chunkCount = Math.floor(appIds.length / CHUNK_SIZE),
    appIds_chunk = 0;

  var benchmark_begin,
    benchmark_end,
    benchmark = 0;

  benchmark_begin = Date.now();

  for (var i = 0; i <= chunkCount; i++) {
    appIds_chunk = makeChunk(appIds);
    XHRs.push(getAppDetailsAjaxCall(appIds_chunk));
  }

  XHRs.push(getAppDetailsAjaxCall(appIds));

  var defer = $.when.apply($, XHRs);
  defer.done(function() {
    benchmark_end = Date.now();
    console.log((benchmark_end - benchmark_begin) / 1000);
    //TODO ready to continue :)
  });
};

function makeChunk(sourceArray) {
  return sourceArray.splice(0, CHUNK_SIZE);
}

$(document).ready(function() {
  $('#button').on('click', getAllApps);
  $('#button2').on('click', getAppDetails);
});