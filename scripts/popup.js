var appIds_discount = [],
  appIds_discount_detailed = [];
var canvasLoaded = 0,
  interval,
  endValue=false;
  animateValue=false;



var getDiscountedApps = function() {
  console.log('getDiscountedApps');
  chrome.storage.local.get(['discounted_apps_detailed'], function(items) {
    if (items.discounted_apps_detailed) {
      appIds_discount_detailed = items.discounted_apps_detailed;

      sortElements(appIds_discount_detailed, {
        parentObj: 'recommendations',
        filter: 'total'
      });
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

      $('.col.result-genre p').each(function(key, value) {
        var $this = $(this);

        if (this.offsetWidth < this.scrollWidth) $this.attr('title', $this.text());
      });
    } else {
      // TODO is there a better way?
      // try again after 10s, recursive
      console.warn('discounted_apps_detailed not in storage');
      setTimeout(getDiscountedApps, 10000);
    }
  });
};

function sortElements(sourceArray, args) {
  var parentObj = args.parentObj,
    filter = args.filter;

  console.log("sortElements by: ", args);
  sourceArray.sort(function(a, b) {

    if (typeof filter !== 'undefined') {
      if (a[parentObj] && b[parentObj]) {
        return ((a[parentObj][filter] < b[parentObj][filter]) ? 1 : ((a[parentObj][filter] > b[parentObj][filter]) ? -1 : 0));
      } else if (a[parentObj]) return -1;
      else if (b[parentObj]) return 1;
      else return 0;
    }
    //if no filter specified, parentObj itself is comparison parameter
    else {
      if (a[parentObj] && b[parentObj]) {
        return ((a[parentObj] < b[parentObj]) ? 1 : ((a[parentObj] > b[parentObj]) ? -1 : 0));
      } else if (a[parentObj]) return -1;
      else if (b[parentObj]) return 1;
      else return 0;
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


  //if ($('#appTab')
  $.each(sourceArray, function(index, value) {
    var isEven = false,
      aClass = '',
      metascoreClass = '',
      metascore = '-',
      genres = [];

    console.log("each " + index + " ", value);
    isEven = index % 2 === 0 ? true : false;
    aClass = isEven === true ? 'even' : 'odd';

    if (value.metacritic) {
      metascore = value.metacritic.score;
    } else {
      metascoreClass = 'unavailable';
    }

    //get genres
    if (value.genres) {
      $.each(value.genres, function(k, v) {
        genres.push(v.description);
      });
      genres = genres.join(', ');

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
        //metascore
        .append(
          $('<a>').addClass('col result-metascore ' + metascoreClass).html(metascore).attr('href', '#')
        )
        //genres
        .append(
          $('<div>').addClass('col result-genre')
          .append(
            $('<p>').html(genres.toString())
          )
        )
        //picture
        .append(
          $('<div>').addClass('col result-capsule')
          .append(
            $('<img>')
            .attr('src', steamSmallCapsuleBaseUrl + value.appid + steamSmallCapsuleAffix)
            .attr('title', value.name)
          )
        )
        /* //name
        .append(
          $('<div>').addClass('col result-name')
          .append(
            $('<h4>').html(value.name) //.attr('title', value.name)
          )
        )*/
        .on('click', function(e) {
          var $meta = $(this).find('a.col.result-metascore'),
            offset = $meta.offset(),
            offsetRight = offset.left + $meta.outerWidth();

          e.preventDefault();

          if (e.pageX > offset.left && e.pageX < offsetRight && metascore !== '-') {
            window.open(value.metacritic.url, '_blank');
          } else {
            window.open($(this).attr('href'), '_blank');
          }

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

function deleteElements() {
  console.log("deleteElements");

  $('#result-content a.result-row').remove();
}

chrome.storage.onChanged.addListener(function(changes, namespace) {
  console.info('Storage changed ', changes);
  //$.inArray('',changes)
});

chrome.runtime.sendMessage("hello");



//TODO show loading state
function attachSortClickHandler() {
  var $priceCol = $('#result-header .col.result-price p'),
    $discountCol = $('#result-header .col.result-discount p'),
    $metaCol = $('#result-header .col.result-metascore p'),
    $genreCol = $('#result-header .col.result-genre p'),
    $nameCol = $('#result-header .col.result-name p');

  console.log("attachSortClickHandler");

  $priceCol.on('click', function() {
    var sortCriteria = {
      parentObj: 'price_overview',
      filter: 'final'
    };
    colClickHandler($(this), sortCriteria);
  });

  $discountCol.on('click', function() {
    var sortCriteria = {
      parentObj: 'price_overview',
      filter: 'discount_percent'
    };
    colClickHandler($(this), sortCriteria);
  });

  $metaCol.on('click', function() {
    var sortCriteria = {
      parentObj: 'metacritic',
      filter: 'score'
    };
    colClickHandler($(this), sortCriteria);
  });

  $genreCol.on('click', function() {
    var sortCriteria = {
      parentObj: 'genres'
    };
    colClickHandler($(this), sortCriteria);
  });

  $nameCol.on('click', function() {
    var sortCriteria = {
      parentObj: 'name'
    };
    colClickHandler($(this), sortCriteria);
  });
}

function colClickHandler(columnReference, sortCriteria) {
  var $arrow = columnReference.next('.arrow'),
    arrowClass = '';

  console.info('price col header clicked');

  if (!($arrow.hasClass('up') || $arrow.hasClass('down'))) {
    sortElements(appIds_discount_detailed, sortCriteria);
    //WARNING workaround for sorting by name
    if (sortCriteria.parentObj === 'name') {
      appIds_discount_detailed.reverse();
    }
    arrowClass = 'down';
    //already clicked before
  } else {
    appIds_discount_detailed.reverse();
    if ($arrow.hasClass('down')) {
      arrowClass = 'up';
    } else {
      arrowClass = 'down';
    }
  }
  $('span.arrow').removeClass('up').removeClass('down');
  $arrow.addClass(arrowClass);

  deleteElements();


  createElements(appIds_discount_detailed);
}

function tabActionHandler() {
  jQuery('.tabs .tab-links a').on('click', function(e) {
    var currentAttrValue = jQuery(this).attr('href');

    // Show/Hide Tabs
    jQuery('.tabs ' + currentAttrValue).show().siblings().hide();

    // Change current tab to active
    jQuery(this).parent('li').addClass('active').siblings().removeClass('active');

    e.preventDefault();
  });
}

function loadCanvas(progress) {
  var canvas = document.getElementById("canvas"),
    context = canvas.getContext("2d"),
    cx = 20, cy = 20, r = 18, lw = 4;

  console.log("Canvas");
  context.clearRect(0, 0, 40, 40);
  context.beginPath();
  context.arc(cx, cy, r, -(Math.PI / 180) * 90 - (Math.PI / 180) * progress * 3.6, -(Math.PI / 180) * 90, false);
  context.lineWidth = lw;
  context.strokeStyle = '#B0AEAC';
  context.stroke();
}

function steamPig(animate,end){
  if(animate===true){
    if (document.getElementById("stay").style.visibility=="visible") {
      document.getElementById("stay").style.visibility="hidden";
      document.getElementById("mid").style.visibility="visible";
    } else if (document.getElementById("mid").style.visibility=="visible") {
      document.getElementById("mid").style.visibility="hidden";
      document.getElementById("jump").style.visibility="visible";
    } else if (document.getElementById("jump").style.visibility=="visible") {
      document.getElementById("jump").style.visibility="hidden";
      document.getElementById("mid2").style.visibility="visible";
    } else if (document.getElementById("mid2").style.visibility=="visible") {
      document.getElementById("mid2").style.visibility="hidden";
      document.getElementById("stay").style.visibility="visible";   
    }
  } else {
    document.getElementById("stay").style.visibility="visible";
    document.getElementById("mid").style.visibility="hidden";
    document.getElementById("mid2").style.visibility="hidden";
    document.getElementById("jump").style.visibility="hidden";
    if (end === true){
      clearInterval(interval);
      valueEnd=false;
    }
  }
}

//DOM Manipulation
$(document).ready(function() {
  chrome.runtime.onMessage.addListener(function(msg) {
    console.log(Math.round(msg.status*100));
    if (msg.status) {
      if (msg.status < 1) {
        loadCanvas(Math.round(msg.status*100));
        animateValue=true;
      } else if (msg.status == 1){
        loadCanvas(100);
        loadCanvas(0);
        animateValue=false;
        endValue=true;
      } else {
          animateValue=false;
          endValue=true;
          }
    }
  });
  interval = setInterval(function(){steamPig(animateValue,endValue);
    }, 150);
  getDiscountedApps();
  attachSortClickHandler();
  tabActionHandler();
});