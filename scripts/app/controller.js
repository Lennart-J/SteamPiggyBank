'use strict';
angular.module('SteamPiggyBank.controllers', ['ui.unique', 'ui.select'])

/* .filter('propsFilter', function() {
  return function(items, props) {
    var out = [];

    if (angular.isArray(items)) {
      var keys = Object.keys(props);
        
      items.forEach(function(item) {
        var itemMatches = false;

        for (var i = 0; i < keys.length; i++) {
          var prop = keys[i];
          var text = props[prop].toLowerCase();
          if (item[prop].toString().toLowerCase().indexOf(text) !== -1) {
            itemMatches = true;
            break;
          }
        }

        if (itemMatches) {
          out.push(item);
        }
      });
    } else {
      // Let the output be the input untouched
      out = items;
    }

    return out;
  };
})*/

.controller('PopupController', function($scope, $rootScope, $window, requestService, $q) {
    Object.defineProperty($scope, "queryFilter", {
        get: function() {
            var out = {};
            out[$scope.queryBy || "$"] = $scope.query;
            return out;
        }
    });
    $scope.disabled = true;
    $scope.appItems = [];
    $scope.uniqueTags = [];
    $scope.activeTags = [];
    $scope.query = {};
    $scope.queryBy = '$';
    $scope.orderExp = '';
    $scope.orderReverse = false;
    $scope.displayLimit = 15;
    $scope.displayLimitChanged = false;

    //load animations variables
    var canvasLoaded = 0,
        interval,
        animate = true;

    chrome.runtime.sendMessage({
        message: "init",
        animate_status: animate
    }, function(response) {
        if (response !== undefined) {
            console.log(response);
            $scope.appItems = response.appItems;
            $scope.$apply();
        }
    });

    beginAnimation();

    chrome.runtime.onMessage.addListener(
        function(request, sender, response) {
            console.log(request.message);
            if (request.message === "loadCanvas") {

                loadCanvas(request.arg);

                if (request.arg === 100) {
                    $scope.disabled = false;
                    endAnimation();
                    setTimeout(function() {
                        loadCanvas(0);
                    }, 2000);
                    $scope.$apply();
                } else if (animate === true) {
                    beginAnimation();
                    animate = false;
                }
            } else if (request.message === "update") {
                $scope.appItems = $scope.appItems.concat(request.appItems);
                $scope.$apply();
                console.log($scope.appItems);
            } else if (request.message === "tags") {
                $scope.uniqueTags = request.tags;
            } else if (request.message === "tagsUpdate") {
                $scope.appItems[request.appItemIndex].userTags = request.tags;
                $scope.$apply();
            }
        }
    );
    /*requestService.getAllApps().then(function(allApps) {
      console.log("Done: ", allApps);
    }, function(reason) {
      //console.log(reason);
    }, function(update) {
      if (animate === false) {
        console.log("listener animation begin");
        beginAnimation();
        animate = true;
      }
      loadCanvas(Math.round(update[1] * 100));
      $scope.appItems = $scope.appItems.concat(update[0]);
    }).then(function() {
      return requestService.getAllUserTags();
    }).then(function(tags) {
      console.log("All User Tags: ", tags);
      var tmp_tags = [];

      for(var i = tags.length - 1; i >= 0; i--) {
        for (var j = tags[i].userTags.length - 1; j >= 0; j--) {
          tmp_tags.push(tags[i].userTags[j]);
        }
      }
      $scope.uniqueTags = uniques(tmp_tags);
      console.log("uniqueTags: ", $scope.uniqueTags);
      loadCanvas(100);
      $scope.disabled = false;
      endAnimation();
      setTimeout(function() {
        loadCanvas(0);
      }, 2000);
    }, function(reason) {
      console.log(reason);
    }, function(userTagChunk) {
      if(!userTagChunk) return;
      console.log(userTagChunk);
      for (var i = $scope.appItems.length - 1; i >= 0; i--) {
        for (var j = userTagChunk.length - 1; j >= 0; j--) {
          if (userTagChunk[j].appId) {
            if ($scope.appItems[i].appid === userTagChunk[j].appId) {
              $scope.appItems[i].userTags = userTagChunk[j].userTags;
              break;
            }
          } else if (userTagChunk[j].packageId) {
            if ($scope.appItems[i].packageId === userTagChunk[j].packageId) {
              $scope.appItems[i].userTags = userTagChunk[j].userTags;
              break;
            }
          }
        }
      }
      );
      });
    }).catch(function(err) {
      console.error(err);
    });*/



    $scope.changeOrder = function(order) {
        console.log("Old order: " + $scope.orderExp + " Old reverse: " + $scope.orderReverse);
        if ($scope.orderExp === order) {
            if (!($scope.orderReverse === false || order === 'discount')) {
                $scope.orderExp = '';
            } else if (order === 'discount' && $scope.orderReverse === false) {
                $scope.orderExp = '';
            }
            $scope.orderReverse = !$scope.orderReverse;
        } else {
            $scope.orderReverse = order === 'discount' ? true : false;
            $scope.orderExp = order;
        }
    };

    $scope.onAppClick = function(app, event) {
        ga('send', 'event', 'Apps', 'click');
        event.preventDefault();
        if (event.which === 1) {
            window.open(app.url, "_blank");
        }

    }

    $(window).bind("scroll", function() {
        if ($(window).scrollTop() + $(window).height() > $(document).height() - 50
            && $scope.displayLimitChanged === false) {
            console.log("more");
            $scope.displayLimit += 10;
            $scope.$apply();
            $scope.displayLimitChanged = true;
        }
        else if ($(window).scrollTop() <= 50) {
            $scope.displayLimit = 15;
            $scope.$apply();
            $scope.displayLimitChanged = true;
        }
        $scope.displayLimitChanged = false;
    });

    $scope.isLoading = function() {
        return $scope.disabled;
    }


    //=====================

    function extend(obj, src) {
        for (var key in src) {
            if (src.hasOwnProperty(key)) obj[key] = src[key];
        }
        return obj;
    }

    function loadCanvas(progress) {
        var canvas = document.getElementById("canvas"),
            context = canvas.getContext("2d"),
            cx = 20,
            cy = 20,
            r = 18,
            lw = 4;

        console.log("Canvas, progress: ", progress);
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
        console.log("beginAnimation function started");
        interval = setInterval(animation, 150);
    }

    function endAnimation() {
        console.log("endAnimation function done");
        clearInterval(interval);
        $('#stay').css("visibility", "visible");
        $('#mid').css("visibility", "hidden");
        $('#jump').css("visibility", "hidden");
        $('#mid2').css("visibility", "hidden");
    }



});