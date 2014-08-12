var appIds = [],
  appIds_discount = [],
  CHUNK_SIZE = 150;

var getAllApps = function() {
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
    });
};


var getAppDetails = function() {
  var chunkCount = Math.floor(appIds.length / CHUNK_SIZE),
    appIds_chunk = 0;

  var callback = function(response) {
    $.each(response, function(key, value) {
      if (value.success === true && !$.isArray(value.data)) {
        if (value.data.price_overview.discount_percent !== 0) {
          appIds_discount.push(key);
        }
      }
    });
    console.log(appIds_discount, appIds_discount.length);
  };

  for (var i = 0; i <= chunkCount; i++) {
    appIds_chunk = makeChunk(appIds);

    $.ajax({
      url: "http://store.steampowered.com/api/appdetails/?appids=" + appIds_chunk.toString() + "&cc=DE&l=english&filters=price_overview",
      type: "GET",
      accepts: "application/json"
    })
      .done(function(response) {
        callback(response);
      });
  }
  $.ajax({
    url: "http://store.steampowered.com/api/appdetails/?appids=" + appIds.toString() + "&cc=DE&l=english&filters=price_overview",
    type: "GET",
    accepts: "application/json"
  })
    .done(function(response) {
      callback(response);
    });
};

function makeChunk(sourceArray) {
  var chunk = [];

  chunk = sourceArray.splice(0, CHUNK_SIZE);

  return chunk;
}

$(document).ready(function() {
  $('#button').on('click', getAllApps);
  $('#button2').on('click', getAppDetails);
});