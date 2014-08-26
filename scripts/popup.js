var appIds_discount = [],
  appIds_discount_detailed = [];


var getDiscountedApps = function() {
  console.log('getDiscountedApps');
  chrome.storage.local.get(['discounted_apps_detailed'], function(items) {
    if (items.discounted_apps_detailed) {
      appIds_discount_detailed = items.discounted_apps_detailed;

      sortElements(appIds_discount_detailed);
      console.log(appIds_discount_detailed);

      createElements(appIds_discount_detailed);

      //dynamically display title if the name is cut off with an ellipsis
      $('.col.result-name h4').on('mouseenter', function() {
        var $this = $(this),
          title = $this.attr('title');

        if (!title) {
          if (this.offsetWidth < this.scrollWidth) $this.attr('title', $this.text());
        } else {
          if (this.offsetWidth >= this.scrollWidth && title == $this.text()) $this.removeAttr('title');
        }
      });
    } else {
      // TODO is there a better way?
      // try again after 10s, recursive
      console.warn('discounted_apps_detailed not in storage');
      setTimeout(getDiscountedApps, 10000);
    }
  });
};

function sortElements(sourceArray) {
  console.log("sortElements");
  sourceArray.sort(function(a, b) {
    if (a.recommendations && b.recommendations) {
      return ((a.recommendations.total < b.recommendations.total) ? 1 : ((a.recommendations.total > b.recommendations.total) ? -1 : 0));
    } else if (a.recommendations) {
      return -1;
    } else if (b.recommendations) {
      return 1;
    } else {
      return 0;
    }
  });
}

function createElements(sourceArray) {
  var steamStoreAppUrl = "http://store.steampowered.com/app/",
    steamSmallCapsuleBaseUrl = "http://cdn.akamai.steamstatic.com/steam/apps/",
    steamSmallCapsuleAffix = "/capsule_sm_120.jpg",
    $resultContent = $('#result-content'),
    currency = "&euro;";

  console.log('createElements');

  $.each(sourceArray, function(index, value) {
    var isEven = false, 
      aClass = '',
      metascore = '-';

    console.log("each " + index + " ", value);
    isEven = index % 2 === 0 ? true : false;
    aClass = isEven === true ? 'even' : 'odd';

    if (value.metacritic) {
      metascore = value.metacritic.score;
    }

    try {
      $resultContent.append(
        $('<a>').addClass('result-row ' + aClass).attr('href', steamStoreAppUrl + value.appid)
        //price
        .append(
          $('<div>').addClass('col result-price')
          .append(
            $('<p>').append(
              $('<del>').html((value.price_overview.initial / 100).toFixed(2) + currency)
            )
          )
          .append(
            $('<p>').html((value.price_overview.final / 100).toFixed(2) + currency)
          )
        )
        //discount
        .append(
          $('<div>').addClass('col result-discount').html(value.price_overview.discount_percent + "%")
        )
        //picture
        .append(
          $('<div>').addClass('col result-capsule')
          .append(
            $('<img>').attr('src', steamSmallCapsuleBaseUrl + value.appid + steamSmallCapsuleAffix)
          )
        )
        //metascore
        .append(
          $('<a>').addClass('col result-metascore').html(metascore)
          .on('click', function(e) {
            e.preventDefault();
            if(metascore !== '-') {
              window.open(value.metacritic.url, 'SteamSalesCatcher');
            } 
          })
        )
        /* //name
        .append(
          $('<div>').addClass('col result-name')
          .append(
            $('<h4>').html(value.name) //.attr('title', value.name)
          )
        )*/
        .on('click', function(e) {
          e.preventDefault();
          window.open($(this).attr('href'), 'SteamSalesCatcher');
        })
      );

    } catch (ex) {
      console.error("Error in createElements: ", ex);
      console.error("At " + index + "with " + value);
    }

    //Icon badge count
    /*chrome.browserAction.setBadgeText({
      text: index.toString()
    });*/
  });
}

chrome.storage.onChanged.addListener(function(changes, namespace) {
  console.info('Storage changed ', changes);
  //$.inArray('',changes)
});

chrome.runtime.sendMessage("hello");

//DOM Manipulation
$(document).ready(function() {

  getDiscountedApps();
});