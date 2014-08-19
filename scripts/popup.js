var appIds_discount = [],
  appIds_discount_detailed = [];


var getDiscountedApps = function() {
  console.log('getDiscountedApps');
  chrome.storage.local.get(['discounted_apps_detailed'], function(items) {
    if (items.discounted_apps_detailed) {
      appIds_discount_detailed = items.discounted_apps_detailed;
      console.log(appIds_discount_detailed.length);
      appIds_discount_detailed = removeDuplicates(appIds_discount_detailed);
      console.log(appIds_discount_detailed.length);

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
      // TODO
      // try again after 10s
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

function removeDuplicates(sourceArray) {
  var uniques = [];

  $.each(sourceArray, function(sourceIndex, sourceElement) {
    $.each(uniques, function(uniquesIndex, uniquesElement) {
      if (sourceElement.appid === uniquesElement.appid) {
        console.log("Found duplicate app ", uniquesElement, sourceElement);
        uniques.splice(uniquesIndex, 1);
      }
    });
    uniques.push(sourceElement);
  });

  return uniques;
}

function createElements(sourceArray) {
  var steamStoreAppUrl = "http://store.steampowered.com/app/",
    steamSmallCapsuleBaseUrl = "http://cdn.akamai.steamstatic.com/steam/apps/",
    steamSmallCapsuleAffix = "/capsule_sm_120.jpg",
    $resultContent = $('#result-content'),
    currency = "&euro;";

  console.log('createElements');

  $.each(sourceArray, function(index, value) {
    var isEven, aClass;
    console.log("each " + index + " ", value);
    isEven = index % 2 === 0 ? true : false;
    aClass = isEven === true ? 'even' : 'odd';
    //if (index <= 10) {
    $resultContent.append(
      $('<a>').addClass('result-row ' + aClass).attr('href', steamStoreAppUrl + value.appid)
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
      .append(
        $('<div>').addClass('col result-discount').html(value.price_overview.discount_percent + "%")
      )
      .append(
        $('<div>').addClass('col result-capsule')
        .append(
          $('<img>').attr('src', steamSmallCapsuleBaseUrl + value.appid + steamSmallCapsuleAffix)
        )
      )
      .append(
        $('<div>').addClass('col result-name')
        .append(
          $('<h4>').html(value.name) //.attr('title', value.name)
        )
      )
      .on('click', function(e) {
        e.preventDefault();
        window.open($(this).attr('href'), 'SteamSalesCatcher');
      })
    );
    //}
  });
}

chrome.storage.onChanged.addListener(function(changes, namespace) {
  console.info('Storage changed ', changes);
  //$.inArray('',changes)
});

//DOM Manipulation
$(document).ready(function() {
  $('a').on('click', function(e) {
    e.preventDefault();
    window.open($(this).attr('href'), 'SteamSalesCatcher');
  });

  getDiscountedApps();


});