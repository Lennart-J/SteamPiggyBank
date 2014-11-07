(function() {
  "use strict";

  var appIds_discount_detailed = [],
    steamLocale = "";
  var canvasLoaded = 0,
    interval,
    animate = false;

  //load background script when popup is loaded
  chrome.runtime.sendMessage("hello");

  var getSteamLocale = function() {

  };

  var getDiscountedApps = function(appIds) {
    console.log("getDiscountedApps");
    chrome.storage.local.get(["discounted_apps_detailed"], function(items) {
      if (items.discounted_apps_detailed) {
        appIds_discount_detailed = items.discounted_apps_detailed;

        /*sortElements(appIds_discount_detailed, {
          parentObj: "recommendations",
          filter: "total"
        });*/
        console.log(appIds_discount_detailed);

        createElements(appIds || appIds_discount_detailed);

        //dynamically display title if the name is cut off with an ellipsis
        applyTooltips();
      }
    });
  };

  chrome.storage.onChanged.addListener(function(changes) {
    console.info("Storage changed ", changes);
    var newAppIds = [],
      outdatedApps = [];
    //$.inArray("",changes)
    if (changes.discounted_apps_detailed) {
      if (changes.discounted_apps_detailed.newValue && changes.discounted_apps_detailed.oldValue) {
        //ids that are in old value but NOT in new value
        outdatedApps = changes.discounted_apps_detailed.oldValue;
        newAppIds = changes.discounted_apps_detailed.newValue;

        outdatedApps = outdatedApps.filter(function(val) {
          var bool = true;
          $.each(changes.discounted_apps_detailed.newValue, function(k, v) {
            if (val.appid === v.appid) {
              bool = false;
            }
          });
          return bool;
        });
        newAppIds = newAppIds.filter(function(val) {
          var bool = true;
          $.each(changes.discounted_apps_detailed.oldValue, function(k, v) {
            if (val.appid === v.appid) {
              bool = false;
            }
          });
          return bool;
        });
        console.log("outdatedApps: " + outdatedApps);
        console.log("newAppIds: " + outdatedApps);
        if (outdatedApps.length !== 0) {
          deleteElementsByIds(outdatedApps);
        }
        getDiscountedApps(newAppIds);
      } else if (changes.discounted_apps_detailed.newValue) {
        getDiscountedApps();
      }
    }
  });

  chrome.runtime.onMessage.addListener(function(msg) {
    if (msg.status) {
      console.log(Math.round(msg.status * 100));
      if (msg.status < 1) {
        console.log("listenser (status <1) animate= " + animate);
        if (animate === false) {
          console.log("listener animation begin");
          beginAnimation();
          animate = true;
        }
        loadCanvas(Math.round(msg.status * 100));
      } else if (msg.status === 1) {
        console.log("listener (status =1) animate= " + animate);
        if (animate === true) {
          console.log("listener animation end");
          endAnimation();
          animate = false;
        }
        loadCanvas(100);
        loadCanvas(0);
      }
    }
  });

  function sortElements(sourceArray, args) {
    var parentObj = args.parentObj,
      filter = args.filter;

    console.log("sortElements by: ", args);
    sourceArray.sort(function(a, b) {

      if (typeof filter !== "undefined") {
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
      $resultContent = $("#result-content");

    console.log("createElements");

    $.each(sourceArray, function(index, value) {
      var isEven = false,
        aClass = "",
        urcClass = "",
        urcText = "-",
        usertags = [],
        id = 0,
        urcTooltip = '',
        urcPercent = '';
      // http://cdn.akamai.steamstatic.com/steam/subs/1741/capsule_sm_120.jpg
      console.log("each " + index + " ", value);
      isEven = index % 2 === 0 ? true : false;
      aClass = isEven === true ? "even" : "odd";



      if (value.packageid) {
        steamStoreAppUrl = "http://store.steampowered.com/sub/";
        steamSmallCapsuleBaseUrl = "http://cdn.akamai.steamstatic.com/steam/subs/";
        id = value.packageid;
      } else {
        steamStoreAppUrl = "http://store.steampowered.com/app/";
        steamSmallCapsuleBaseUrl = "http://cdn.akamai.steamstatic.com/steam/apps/";
        id = value.appid;
      }
      //get usertags
      if (value.usertags) {
        $.each(value.usertags, function(k, v) {
          usertags.push(v.description);
        });
        usertags = usertags.join(", ");

      }
      if (value.urcClass) {
        urcText = value.urcText;
        urcClass = value.urcClass
      } else {
        urcClass = "unavailable";
      }
      if (value.urcText) {
        var pattern = /\d+%/g;
        urcTooltip = value.urcText.replace(/<br\b[^>]*>/ig, ': ');
        urcPercent = pattern.exec(value.urcText)[0];
      }

      try {
        $resultContent.append(
          $("<a>").addClass("result-row " + aClass).attr("href", steamStoreAppUrl + id + "?utm_source=SteamPiggyBank&utm_medium=SteamPiggyBank&utm_campaign=SPB+Chrome+Extension")
          //price
          .append(
            $("<div>").addClass("col result-price")
            .append(
              $("<p>").append(
                $("<del>").html(value.oldprice)
              )
            )
            .append(
              $("<p>").html(value.newprice)
            )
          )
          //discount
          .append(
            $("<div>").addClass("col result-discount").html(value.discount)
          )
          //urc
          .append(
            $("<a>").addClass("col result-urc " + urcClass)
            .html(urcPercent).attr("href", "#")
            .attr('title', urcTooltip)
          )
          //genres
          .append(
            $("<div>").addClass("col result-usertags")
            .append(
              $("<p>").html(usertags.toString())
            )
          )
          //picture
          .append(
            $("<div>").addClass("col result-capsule")
            .append(
              $("<img>")
              .attr("src", steamSmallCapsuleBaseUrl + id + steamSmallCapsuleAffix)
              .attr("title", value.name)
            )
          )
          .on("click", function() {
            window.open($(this).attr("href"), "_blank");
          })
        );

      } catch (ex) {
        console.error("Error in createElements: ", ex);
        console.error("At " + index + "with " + value);
      }
    });
  }

  function applyTooltips() {
    $(".col.result-usertags p").each(function() {
      var $this = $(this);

      if (this.offsetWidth < this.scrollWidth) $this.attr("title", $this.text());
    });
  }

  var currencyLocaleMap = {
    "GBP": "en-GB",
    "USD": "en-US",
    "EUR": "de-DE",
    "RUB": "ru-AD",
    "BRL": "br-DF",
    "JPY": "ja-JP",
    "IDR": "en",
    "MYR": "en",
    "PHP": "ph",
    "SGD": "en",
    "THB": "th",
    "AUD": "en-AU",
    "NZD": "en-NZ",
    "CAD": "en-CA",
    "NOK": "no",
    "KRW": "en",
    "TRY": "en",
    "MXN": "en"
  };

  function formatPrice(val, currency) {
    var locale = currencyLocaleMap[currency];

    if (locale !== "") {
      return Number(val.toFixed(2) / 100).toLocaleString(locale, {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2
      });
    } else {
      return Number(val.toFixed(2) / 100).toLocaleString({
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2
      });
    }
  }

  function deleteElements() {
    console.log("deleteElements");
    $("#result-content a.result-row").remove();
  }

  function deleteElementsByIds(appids) {
    console.log("deleteElementsById: ", appids);
    $("#result-content a.result-row").each(function(index, element) {
      var el_appid = $(element).attr("href").replace("http://store.steampowered.com/app/", "");
      if (appids.indexOf(el_appid) > -1) $(element).remove();
    });
  }

  //TODO show loading state
  function attachSortClickHandler() {
    var $priceCol = $("#result-header .col.result-price p"),
      $discountCol = $("#result-header .col.result-discount p"),
      $urcCol = $("#result-header .col.result-urc p"),
      $usertagCol = $("#result-header .col.result-usertags p"),
      $nameCol = $("#result-header .col.result-name p");

    console.log("attachSortClickHandler");

    $priceCol.on("click", function() {
      var sortCriteria = {
        parentObj: "newprice"
      };
      colClickHandler($(this), sortCriteria);
      filterBySelectedTags(readPopupSelection());
    });

    $discountCol.on("click", function() {
      var sortCriteria = {
        parentObj: "discount"
      };
      colClickHandler($(this), sortCriteria);
      filterBySelectedTags(readPopupSelection());
    });

    $urcCol.on("click", function() {
      var sortCriteria = {
        parentObj: 'urcScore',
      };
      colClickHandler($(this), sortCriteria);
      filterBySelectedTags(readPopupSelection());
    });

    $usertagCol.on("click", function() {
      var sortCriteria = {
        parentObj: "tags"
      };
      //colClickHandler($(this), sortCriteria);
      // showUserTagPopup();
    });

    $nameCol.on("click", function() {
      var sortCriteria = {
        parentObj: "name"
      };
      colClickHandler($(this), sortCriteria);
      filterBySelectedTags(readPopupSelection());
    });
  }

  function colClickHandler(columnReference, sortCriteria) {
    var $arrow = columnReference.next(".arrow"),
      arrowClass = "";

    console.info("price col header clicked");

    if (!($arrow.hasClass("up") || $arrow.hasClass("down"))) {
      sortElements(appIds_discount_detailed, sortCriteria);
      //WARNING workaround for sorting by name
      if (sortCriteria.parentObj === "name") {
        appIds_discount_detailed.reverse();
      }
      arrowClass = "down";
      //already clicked before
    } else {
      appIds_discount_detailed.reverse();
      if ($arrow.hasClass("down")) {
        arrowClass = "up";
      } else {
        arrowClass = "down";
      }
    }
    $("span.arrow").removeClass("up").removeClass("down");
    $arrow.addClass(arrowClass);

    deleteElements();

    createElements(appIds_discount_detailed);
    applyTooltips();
  }


  function loadCanvas(progress) {
    var canvas = document.getElementById("canvas"),
      context = canvas.getContext("2d"),
      cx = 20,
      cy = 20,
      r = 18,
      lw = 4;

    console.log("Canvas");
    context.clearRect(0, 0, 40, 40);
    context.beginPath();
    context.arc(cx, cy, r, -(Math.PI / 180) * 90 - (Math.PI / 180) * progress * 3.6, -(Math.PI / 180) * 90, false);
    context.lineWidth = lw;
    context.strokeStyle = "#67c1f5";
    context.stroke();
  }

  var animation = function() {
    console.log("animation function running");
    if ($('#stay').css("visibility") === "visible") {
      $('#stay').css("visibility", "hidden");
      $('#mid').css("visibility", "visible");
    } else if ($('#mid').css("visibility") === "visible") {
      $('#mid').css("visibility", "hidden");
      $('#jump').css("visibility", "visible");
    } else if ($('#jump').css("visibility") === "visible") {
      $('#jump').css("visibility", "hidden");
      $('#mid2').css("visibility", "visible");
    } else if ($('#mid2').css("visibility") === "visible") {
      $('#mid2').css("visibility", "hidden");
      $('#stay').css("visibility", "visible");
    }
  };

  function beginAnimation() {
    console.log("beginAnimation function running");
    interval = setInterval(animation, 150);
  }

  function endAnimation() {
    console.log("endAnimation function running");
    clearInterval(interval);
    $('#stay').css("visibility", "visible");
    $('#mid').css("visibility", "hidden");
    $('#jump').css("visibility", "hidden");
    $('#mid2').css("visibility", "hidden");
  }

  var convertObjectToArray = function(obj) {
    var arr = [];
    try {
      for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
          if (typeof i === 'number') {
            arr[i] = obj[i];
          } else {
            arr.push(obj[i]);
          }
        }
      }

    } catch (e) {
      console.log(e);
    }
    return arr;
  };

  function populateUserTagPopup(tags) {
    console.log("populateGenrePopup");
    try {
      $.each(tags, function(index, element) {
        $(".result-usertags").find(".popup-body").append(
          $("<p>").html(element)
        );
      });
    } catch (e) {
      console.warn(e);
    }
  }

  function deletePopupContent() {
    $(".result-usertags").find(".popup-body p").remove();
  }


  function readPopupSelection() {
    var selectedTags = [];

    $(".result-usertags").find(".popup-body p.selected").each(function(index, element) {
      selectedTags.push($(element).html());
    });

    return selectedTags;
  }

  function filterBySelectedTags(tags) {
    var el_tagString = "",
      el_tagArray = [];

    resetUserTagFilter();

    $("#result-content a.result-row").each(function(index, element) {
      el_tagString = $(element).find(".col.result-usertags p").html();
      el_tagArray = el_tagString.split(", ");

      for (var i = 0, tagsLength = tags.length; i < tagsLength; i++) {
        if (el_tagArray.indexOf(tags[i]) === -1) {
          $(element).hide();
        }
      }
    });
  }

  function resetUserTagFilter() {
    $("#result-content a.result-row").show();
  }

  function clearPopupSelection() {
    $(".result-usertags").find(".popup-body p.selected").each(function(index, element) {
      $(element).removeClass("selected");
    });
  }

  function showUserTagPopup() {
    $(".result-usertags .popup").show();
    $(".result-usertags .popup").focus();
  }


  function attachUserTagPopupListeners() {
    $(".result-usertags").find(".popup p").on("click", function() {
      var that = $(this);

      if (that.hasClass("selected")) {
        that.removeClass("selected");
      } else {
        that.addClass("selected");
      }
    });

    $(".result-usertags").find(".submit").on("click", function() {

    });

    $(".result-usertags").find(".dismiss").on("click", function() {
      clearPopupSelection();
      resetUserTagFilter();
      $(".result-usertags .popup").blur();
    });

    $(".result-usertags .popup").find('p').on("click", function() {
      filterBySelectedTags(readPopupSelection());
    });

    $(".result-usertags .popup").on('blur', function() {
      $(this).fadeOut(300);
    });
  }

  //DOM Manipulation
  $(document).ready(function() {
    var tags = [];
    chrome.storage.local.get(["status", "usertags"], function(items) {
      console.log(items);
      if (items.status !== undefined) {
        if (items.status < 1) {
          console.log("storage (status <1) animate= " + animate);
          if (animate === false) {
            console.log("storage animation start");
            beginAnimation();
            animate = true;
          }
          loadCanvas(Math.round(items.status * 100));
        } else if (items.status === 1) {
          console.log("storage (status =1) animate= " + animate);
          if (animate === true) {
            console.log("storage animation end");
            endAnimation();
            animate = false;
            loadCanvas(100);
            loadCanvas(0);
          }
        }
      }

      if (items.usertags) {
        tags = convertObjectToArray(items.usertags);
        deletePopupContent();
        populateUserTagPopup(tags);
        attachUserTagPopupListeners();
      }
    });
    getDiscountedApps();
    attachSortClickHandler();

  });
}());