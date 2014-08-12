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
    })
    .error(function(xhr, textStatus, errorThrown) {
      if (textStatus == 'timeout') {
        this.tryCount++;
        if (this.tryCount <= this.retryLimit) {
          //try again
          $.ajax(this);
          return;
        }
        return;
      }
      if (xhr.status == 500) {
        //handle error
      } else {
        //handle error
      }
    });
};


var getAppDetails = function() {
  var chunkCount = Math.floor(appIds.length / CHUNK_SIZE),
    appIds_chunk = 0;
  var benchmark_begin, benchmark_end, benchmark = 0;
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

  benchmark_begin = Date.now();
  for (var i = 0; i <= chunkCount; i++) {
    appIds_chunk = makeChunk(appIds);

    XHRs.push($.ajax({
      url: "http://store.steampowered.com/api/appdetails/?appids=" + appIds_chunk.toString() + "&cc=DE&l=english&filters=price_overview",
      type: "GET",
      accepts: "application/json",
      retryLimit: 3
    }));
    /*.done(function(response) {
        callback(response);
        var benchmark_end = Date.now();
        console.log((benchmark_end - this.benchmark_begin)/1000);
        benchmark += (benchmark_end - this.benchmark_begin)/1000;
        
      })
      .error(function(xhr, textStatus, errorThrown) {
        if (textStatus == 'timeout') {
          this.tryCount++;
          if (this.tryCount <= this.retryLimit) {
            //try again
            console.info("Retry_"+tryCount);
            $.ajax(this);
            return;
          }
          return;
        }
        if (xhr.status == 500) {
          //handle error
        } else {
          //handle error
        }
      }); */
  }


  XHRs.push($.ajax({
    url: "http://store.steampowered.com/api/appdetails/?appids=" + appIds.toString() + "&cc=DE&l=english&filters=price_overview",
    type: "GET",
    accepts: "application/json",
    retryLimit: 3
  }));
  /*.done(function(response) {
      callback(response);
      var benchmark_end = Date.now();
      console.log((benchmark_end - this.benchmark_begin)/1000);
      benchmark += (benchmark_end - this.benchmark_begin)/1000;
      
      
    })
    .error(function(xhr, textStatus, errorThrown) {
      if (textStatus == 'timeout') {
        this.tryCount++;
        if (this.tryCount <= this.retryLimit) {
          //try again
          $.ajax(this);
          return;
        }
        return;
      }
      if (xhr.status == 500) {
        //handle error
      } else {
        //handle error
      }
    }); */
  $.each(XHRs, function(index, value) {
    value.done(function(response) {
      callback(response);
    });
    value.error(function(xhr, textStatus, errorThrown) {
      if (textStatus == 'timeout') {
        this.tryCount++;
        if (this.tryCount <= this.retryLimit) {
          //try again
          // TO DO
          XHRs.push($.ajax(this));
          return;
        }
        return;
      }
      if (xhr.status == 500) {
        //handle error
      } else {
        //handle error
      }
    });
  });

  var defer = $.when.apply($, XHRs);
  defer.done(function(){

    benchmark_end = Date.now();
    console.log((benchmark_end - benchmark_begin)/1000);

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