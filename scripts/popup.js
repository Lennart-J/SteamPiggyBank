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
    chrome.storage.local.get(["countryCode"], function(items) {
      if (items.countryCode) {
        return items.countryCode;
      }
    });
  };

  var getDiscountedApps = function(appIds) {
    console.log("getDiscountedApps");
    chrome.storage.local.get(["discounted_apps_detailed"], function(items) {
      if (items.discounted_apps_detailed) {
        appIds_discount_detailed = items.discounted_apps_detailed;

        sortElements(appIds_discount_detailed, {
          parentObj: "recommendations",
          filter: "total"
        });
        console.log(appIds_discount_detailed);

        createElements(appIds || appIds_discount_detailed);

        //dynamically display title if the name is cut off with an ellipsis
        applyTooltips();
      }
      /*else {
        // TODO is there a better way?
        // try again after 10s, recursive
        console.warn("discounted_apps_detailed not in storage");
        setTimeout(getDiscountedApps, 10000);
      }*/
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

    if (changes.genres) {
      //!TODO
      /*var genres = convertObjectToArray(changes.genres.newValue);;
      if (changes.genres.newValue && changes.genres.oldValue) {
        deletePopupContent();
        populateGenrePopup(genres);
        attachGenrePopupListeners();
      } else if (changes.genres.newValue) {
        populateGenrePopup(genres);
        attachGenrePopupListeners();
      }*/

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
        metascoreClass = "",
        metascore = "-",
        genres = [];

      console.log("each " + index + " ", value);
      isEven = index % 2 === 0 ? true : false;
      aClass = isEven === true ? "even" : "odd";

      if (value.metacritic) {
        metascore = value.metacritic.score;
      } else {
        metascoreClass = "unavailable";
      }

      //get genres
      if (value.genres) {
        $.each(value.genres, function(k, v) {
          genres.push(v.description);
        });
        genres = genres.join(", ");

      }

      try {
        $resultContent.append(
          $("<a>").addClass("result-row " + aClass).attr("href", steamStoreAppUrl + value.appid)
          //price
          .append(
            $("<div>").addClass("col result-price")
            .append(
              $("<p>").append(
                $("<del>").html(formatPrice(value.price_overview.initial, value.price_overview.currency))
              )
            )
            .append(
              $("<p>").html(formatPrice(value.price_overview.final, value.price_overview.currency))
            )
          )
          //discount
          .append(
            $("<div>").addClass("col result-discount").html(value.price_overview.discount_percent + "%")
          )
          //metascore
          .append(
            $("<a>").addClass("col result-metascore " + metascoreClass).html(metascore).attr("href", "#")
          )
          //genres
          .append(
            $("<div>").addClass("col result-genre")
            .append(
              $("<p>").html(genres.toString())
            )
          )
          //picture
          .append(
            $("<div>").addClass("col result-capsule")
            .append(
              $("<img>")
              .attr("src", steamSmallCapsuleBaseUrl + value.appid + steamSmallCapsuleAffix)
              .attr("title", value.name)
            )
          )
          /* //name
        .append(
          $("<div>").addClass("col result-name")
          .append(
            $("<h4>").html(value.name) //.attr("title", value.name)
          )
        )*/
          .on("click", function(e) {
            var $meta = $(this).find("a.col.result-metascore"),
              offset = $meta.offset(),
              offsetRight = offset.left + $meta.outerWidth();

            e.preventDefault();

            if (e.pageX > offset.left && e.pageX < offsetRight && metascore !== "-") {
              window.open(value.metacritic.url, "_blank");
            } else {
              window.open($(this).attr("href"), "_blank");
            }

          })
        );

      } catch (ex) {
        console.error("Error in createElements: ", ex);
        console.error("At " + index + "with " + value);
      }
    });
  }

  function applyTooltips() {
    $(".col.result-genre p").each(function() {
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
      $metaCol = $("#result-header .col.result-metascore p"),
      $genreCol = $("#result-header .col.result-genre p"),
      $nameCol = $("#result-header .col.result-name p");

    console.log("attachSortClickHandler");

    $priceCol.on("click", function() {
      var sortCriteria = {
        parentObj: "price_overview",
        filter: "final"
      };
      colClickHandler($(this), sortCriteria);
      filterBySelectedGenres(readPopupSelection());
    });

    $discountCol.on("click", function() {
      var sortCriteria = {
        parentObj: "price_overview",
        filter: "discount_percent"
      };
      colClickHandler($(this), sortCriteria);
      filterBySelectedGenres(readPopupSelection());
    });

    $metaCol.on("click", function() {
      var sortCriteria = {
        parentObj: "metacritic",
        filter: "score"
      };
      colClickHandler($(this), sortCriteria);
      filterBySelectedGenres(readPopupSelection());
    });

    $genreCol.on("click", function() {
      var sortCriteria = {
        parentObj: "genres"
      };
      //colClickHandler($(this), sortCriteria);
      showGenrePopup();
    });

    $nameCol.on("click", function() {
      var sortCriteria = {
        parentObj: "name"
      };
      colClickHandler($(this), sortCriteria);
      filterBySelectedGenres(readPopupSelection());
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

  function populateGenrePopup(genres) {
    console.log("populateGenrePopup");
    try {
      $.each(genres, function(index, element) {
        $(".result-genre").find(".popup-body").append(
          $("<p>").html(element)
        );
      });
    } catch (e) {
      console.warn(e);
    }
  }

  function deletePopupContent() {
    $(".result-genre").find(".popup-body p").remove();
  }


  function readPopupSelection() {
    var selectedGenres = [];

    $(".result-genre").find(".popup-body p.selected").each(function(index, element) {
      selectedGenres.push($(element).html());
    });

    return selectedGenres;
  }

  function filterBySelectedGenres(genres) {
    var el_genreString = "",
      el_genreArray = [];

    resetGenreFilter();

    $("#result-content a.result-row").each(function(index, element) {
      el_genreString = $(element).find(".col.result-genre p").html();
      el_genreArray = el_genreString.split(", ");

      for (var i = 0, genresLength = genres.length; i < genresLength; i++) {
        if (el_genreArray.indexOf(genres[i]) === -1) {
          $(element).hide();
        } 
      }
    });
  }

  function resetGenreFilter() {
    $("#result-content a.result-row").show();
  }

  function clearPopupSelection() {
    $(".result-genre").find(".popup-body p.selected").each(function(index, element) {
      $(element).removeClass("selected");
    });
  }

  function showGenrePopup() {
    $(".result-genre .popup").show();
    $(".result-genre .popup").focus();
  }


  function attachGenrePopupListeners() {
    $(".result-genre").find(".popup p").on("click", function() {
      var that = $(this);

      if (that.hasClass("selected")) {
        that.removeClass("selected");
      } else {
        that.addClass("selected");
      }
    });

    $(".result-genre").find(".submit").on("click", function() {
      
    });

    $(".result-genre").find(".dismiss").on("click", function() {
      clearPopupSelection();
      resetGenreFilter();
      $(".result-genre .popup").blur();
    });

     $(".result-genre .popup").find('p').on("click", function() {
      filterBySelectedGenres(readPopupSelection());
     });

    $(".result-genre .popup").on('blur', function() {
      $(this).fadeOut(300);
    });
  }

  //DOM Manipulation
  $(document).ready(function() {
    var genres = [];
    chrome.storage.local.get(["status", "genres"], function(items) {
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

      if (items.genres) {
        genres = convertObjectToArray(items.genres);
        deletePopupContent();
        populateGenrePopup(genres);
        attachGenrePopupListeners();
      }
    });
    steamLocale = getSteamLocale();
    getDiscountedApps();
    attachSortClickHandler();

  });
}());