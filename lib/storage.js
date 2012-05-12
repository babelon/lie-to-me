
var Store, one_week;

Store = require('redis').createClient();

one_week = 60 * 60 * 24 * 7;

exports.configure = function(server) {

  server.on('close', function() {
    Store.quit();
  });

};

function redis() {
  var command, args;
  if (arguments.length < 1) {
    throw new Error('Need to specify a redis command');
  }
  command = arguments[0];
  args = Array.prototype.slice.call(arguments, 1);
  return Store[command].apply(Store, args);
};
exports.redis = redis;

/**
 * Redis commands
 * get points
 * get access time
 * set access time
 */
exports.middleware = function (req, res, next) {
  res.metastore = res.metastore || {};
  if (!req.session.person) { next(); return; }
  var commands, now;
  now = new Date();
  commands = redis('multi');
  commands.get(String(req.session.person._id) + '_points');
  commands.get(String(req.session.person._id) + '_access');
  commands.setex(String(req.session.person._id) + '_access', one_week, now.toISOString());
  commands.exec(function(err, replies) {
    if (err) { console.error(err); next(); return; }
    res.metastore.points = Number(replies[0]);
    res.metastore.access = new Date( replies[1] ? replies[1] : Date.now() - one_week * 1000 );
    next();
  });
}
