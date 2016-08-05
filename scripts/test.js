/*Key: 780979B5681D3BE94F837360F9A82D73
Domain Name: l.jarms@hotmail.de*/

//redirect? https://mnadageogkcibhmepnladdkgajhppakd.chromiumapp.org/index.html
// https%3A%2F%2Fmnadageogkcibhmepnladdkgajhppakd.chromiumapp.org%2Findex.html

//wishlist:   http://steamcommunity.com/profiles/{{STEAM_ID}}/wishlist
// https://steamcommunity.com/openid/login?
// openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&
// openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&
// openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&
// openid.mode=checkid_setup&
// openid.realm=https%3A%2F%2Fmnadageogkcibhmepnladdkgajhppakd.chromiumapp.org%2F
// openid.return_to=https%3A%2F%2Fsteamdb.info%2Flogin%2F

// https://steamcommunity.com/openid/login?openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.mode=checkid_setup&openid.realm=https%3A%2F%2Fmnadageogkcibhmepnladdkgajhppakd.chromiumapp.org%2F&openid.return_to=https%3A%2F%2Fmnadageogkcibhmepnladdkgajhppakd.chromiumapp.org%2Findex.html
$('.result-row').on('click', function(e) {
  console.log("hello");
  window.open($(this).attr("href"), "_blank");
});