var req = require('sync-request');

var BASE_URL_LABEL = 'https://api.fda.gov/drug/label.json';
var BASE_URL_EVENT = 'https://api.fda.gov/drug/event.json';

module.exports = {
  
  getDrugLabel: drug => {
    return req('GET', BASE_URL_LABEL + '?search=' + drug).getBody();
  },
  
  getDrugEvent: drug => {
    return req('GET', BASE_URL_EVENT + '?search=' + drug).getBody();
  }
  
}