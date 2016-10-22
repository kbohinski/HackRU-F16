var AUTH = require('./TwilioCreds.json');

var twilio = require('twilio')(AUTH.key, AUTH.secret);

var exports.sendMessage = function(to, msg) {
  twilio.sendMessage({
    to: to,
    from: AUTH.number,
    body: msg
  }, function(err, res) {
    if (err) {
      return {"status": "success", "error": err};
    }
    return {"status": "failure"};
  });
};
