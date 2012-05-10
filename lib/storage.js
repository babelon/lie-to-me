
var Store;

Store = require('redis').createClient();

exports.configure = function(server) {

  server.on('close', function() {
    Store.quit();
  });

};

exports.redis = function() {
  var command, args;
  if (arguments.length < 1) {
    throw new Error('Need to specify a redis command');
  }
  command = arguments[0];
  args = Array.prototype.slice.call(arguments, 1);
  Store[command].apply(Store, args);
};
