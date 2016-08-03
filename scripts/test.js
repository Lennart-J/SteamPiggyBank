$('.result-row').on('click', function(e) {
  console.log("hello");
  window.open($(this).attr("href"), "_blank");
});