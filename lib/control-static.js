
var fs;

fs = require('fs');

/**
 * Static File Linking
 */

exports.configure = function(server) {

  server.get('/add', function(req, res) {
    res.sendfile('static/add.html');
  });

};
