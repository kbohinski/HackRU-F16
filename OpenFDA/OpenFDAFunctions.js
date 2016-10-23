var req = require('sync-request');

var BASE_URL_LABEL = 'https://api.fda.gov/drug/label.json';
var BASE_URL_EVENT = 'https://api.fda.gov/drug/event.json';

var exports.getDrugLabel = function(drug) {
  return req('GET', BASE_URL_LABEL + '?search=' + drug).getBody();
}

exports.getDrugEvent = function(drug) {
  return req('GET', BASE_URL_EVENT + '?search=' + drug).getBody();
}
