var appIds_discount = [];

var getDiscountedApps = function() {

};



chrome.storage.onChanged.addListener(function(changes, namespace) {
  console.info('Storage changed ', changes);
  //$.inArray('',changes)
});

//DOM Manipulation
$(document).ready(function() {
  $('#button')
  //.on('click', getAllApps)
  .attr('disabled', true);
  $('#button2')
  //.on('click', processAppDetails)
  .attr('disabled', true);
  $('#button3')
    .on('click', getDiscountedApps);
  //.attr('disabled', true);
});