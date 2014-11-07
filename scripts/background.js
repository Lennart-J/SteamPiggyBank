(function() {
  "use strict";

  var appIds = [],
    appIdsLength = 0,
    appIds_discount = [],
    appIds_discount_detailed = [],
    packageIds_discount = [],
    packageIds_discount_detailed = [],
    outdated_appIds = [];
  var XHRs = {
      appFiltered: [],
      appDetails: [],
      appVerification: [],
      packageDetails: []
    },
    CHUNK_SIZE = 170,
    XHRsinProgress = false,
    retrievedCountryCode = false;
  var genres = [],
    genresObj = {};

  chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === "update") {
      /*getAllApps();*/
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
    var XHRs = [],
      response = '',
      parent = {},
      currentPage = 1,
      maxPage = 0,
      tmp_list = [],
      allItemsOnSale = [],
      $data,
      status = 0,
      allUserTags = [];

    $.get('http://store.steampowered.com/search/?specials=1', function(data) {
      // console.log(data);
      $data = $(data.replace(/<img\b[^>]*>/ig, ''));
      parent = $data.find('#search_result_container');
      // console.log(parent);
      maxPage = findLastSalePage(parent);
      // console.log(maxPage);
      tmp_list = findSaleItems(parent);
      console.log(tmp_list);

      allUserTags = findAllUserTags($data);
      console.log(allUserTags);

      var pattern = /^(0|[1-9][0-9]{0,2}(?:(,[0-9]{3})*|[0-9]*))(\.[0-9]+){0,1}$/;
      var deb = $(tmp_list[0]).find('.search_reviewscore span').data('storeTooltip')
      console.log(deb.replace(/^\D+/g, ''));

      allItemsOnSale = allItemsOnSale.concat(parseDOMElementList(tmp_list));
      currentPage++;
      tmp_list = [];
      for (; currentPage <= maxPage; currentPage++) {
        XHRs.push(
          $.get('http://store.steampowered.com/search/?specials=1&page=' + currentPage, function(data) {
            $data = $(data.replace(/<img\b[^>]*>/ig, ''));
            parent = $data.find('#search_result_container');
            tmp_list = findSaleItems(parent);
            allItemsOnSale = allItemsOnSale.concat(parseDOMElementList(tmp_list));
            tmp_list = [];
          })
          .always(function() {
            status += 1 / maxPage;
            chrome.runtime.sendMessage({
              status: status
            });
          })

        );
      }

      var defer = $.when.apply($, XHRs);
      defer.always(function() {
        console.log(allItemsOnSale);
        chrome.storage.local.set({
          "discounted_apps_detailed": allItemsOnSale,
          "usertags": allUserTags
        }, function() {
          console.log('commited');
          console.log(allItemsOnSale);
          chrome.runtime.sendMessage({
            status: 1
          });
        });
      });
    });

    var findLastSalePage = function(parent) {
      return parent.find('.pagebtn').prev().html();
    }

    var findSaleItems = function(parent) {
      return parent.find('.search_rule').next().children('a');
    }

    var findAllUserTags = function(parent) {
      var tag_array = [],
        tag_elements = parent.find('#TagFilter_Container .tab_filter_control');

      $.each(tag_elements, function(key, el) {
        tag_array.push($(el).data('loc'));
      });

      return tag_array;
    }

    var parseDOMElementList = function(list, callback) {
      var appitems = [],
        appitem = {};
      $.each(list, function(key, el) {
        var $el = $(el),
          urcText = getUserReviewScoreText($el);


        appitem.appid = getAppId($el);
        appitem.packageid = getPackageId($el);
        appitem.name = getName($el);
        appitem.released = getReleaseDate($el);
        appitem.oldprice = getOldPrice($el);
        appitem.newprice = getNewPrice($el);
        appitem.discount = getDiscount($el);
        appitem.urcText = urcText;
        appitem.urcScore = getUrcScore(urcText);
        appitem.urcClass = getUserReviewScoreClass($el);


        appitems.push(appitem);
        appitem = {};
      });

      return appitems;



      function getAppId(element) {
        return element.data("dsAppid").toString();
      }

      function getPackageId(element) {
        var pid = element.data("dsPackageid");
        return pid ? pid.toString() : undefined;
      }

      function getName(element) {
        return element.find('.title').html();
      }

      function getReleaseDate(element) {
        return element.find('.search_released').html();
      }

      function getOldPrice(element) {
        return element.find('strike').html();
      }

      function getNewPrice(element) {
        return element.find('.search_price.discounted').contents()
          .filter(function() {
            return this.nodeType === Node.TEXT_NODE;
          }).last().text();
      }

      function getDiscount(element) {
        return element.find('.search_discount span').text();
      }

      function getUserReviewScoreClass(element) {
        var el = element.find('.search_reviewscore span');

        if (el.hasClass('positive')) return 'positive';
        else if (el.hasClass('positive')) return 'mixed';
        else if (el.hasClass('negative')) return 'negative';
      }

      function getUserReviewScoreText(element) {
        return element.find('.search_reviewscore span').data('storeTooltip')
      }

      function getUrcScore(str) {
        if (str === undefined) return;
        var urcPercent = findUrcPercent(str) / 100,
          urcCount = findUrcCount(str.replace(/\d+%/g));

        return (urcPercent - (1 - urcPercent)) * urcCount;

        function findUrcPercent(str) {
          var pattern = /\d+%/g;
          return parseInt(pattern.exec(str)[0].replace('%', ''));
        }

        function findUrcCount(str) {
          var pattern = /\d+(,)?\d+/g,
            result = pattern.exec(str);
          if (result !== null) return parseInt(result[0].replace(',', ''));
        }
      }

      function parseUserTags(parent) {
        var arr = [];

        $.each(parent.find('.app_tag'), function(key, el) {
          arr.push($(el).html());
        });
        console.log("usertags: ", arr);

        return arr;
      }

    }
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

  //Immediate initialization function called on browser start, i.e. when bg script is initialized
  (function() {
    console.info("init");
    getAllApps();

  })();
}());