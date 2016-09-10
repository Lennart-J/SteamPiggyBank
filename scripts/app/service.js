'use strict';
angular.module('SteamPiggyBank.services', [])

.service('util', function() {
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

  this.formatPrice = function(val, currency) {
    var locale = currencyLocaleMap[currency];

    if (locale !== "") {
      return Number(val.toFixed(2) / 100).toLocaleString(locale, {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2
      }).replace(/\s/g,'');
    } else {
      return Number(val.toFixed(2) / 100).toLocaleString({
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2
      }).replace(/\s/g,'');
    }
  };

  this.track = function(type, element, action) {
        chrome.storage.local.get(["options"], function(items) {
            if (items.options && items.options.trackingEnabled) {
                console.log("Track: ", type, element, action);
                if (type === 'event') {
                    ga('send', 'event', element, action);
                } else if (type === 'pageview') {
                    ga('send', 'pageview', element);
                }
            }
        });
    };
})

.service('filterService', function() {
  var filters = [
    {
      'name' : 'Price',
      'values' : [{'name' : 'Maximum', 'display' : 'range', 'value' : '100', 'max' : '100'}, {'name' : 'Minimum', 'display' : 'range', 'value' : '0', 'max' : '100'}]
    },
    {
      'name' : 'Discount',
      'values' : [{'name' : 'Minimum', 'display' : 'range', 'value' : '0', 'max' : '100'}]
    },
    {
      'name' : 'Type',
      'values' : [{'name' : 'Game', 'display' : 'toggle', 'value' : true}, {'name' : 'DLC', 'display' : 'toggle', 'value' : true}, {'name' : 'Package', 'display' : 'toggle', 'value' : true}, {'name' : 'Software', 'display' : 'toggle', 'value' : true}]
    },
    {
      'name' : 'Platforms',
      'values' : [{'name' : 'Windows', 'display' : 'toggle', 'value' : true}, {'name' : 'Mac', 'display' : 'toggle', 'value' : true}, {'name' : 'Linux', 'display' : 'toggle' , 'value' : true}]
    }
  ];

  this.getFilters = function() {
    return filters;
  };

  this.getFilter = function(name) {
    $.each(filters, function(index, filter) {
      //console.log(filter.name, name);
      if (filter.name === name) {
        return filter;
      }
    });
  };

  this.getFilterValue = function(filterName, valueName) {
    for (var i = 0, filterLength = filters.length; i < filterLength; i++) {
      if (filters[i].name === filterName) {
        for (var j = 0, valuesLength = filters[i].values.length; j < valuesLength; j++) {
          if (filters[i].values[j].name === valueName) {
                return filters[i].values[j].value;
            }
        }
      }
    }
  };


});