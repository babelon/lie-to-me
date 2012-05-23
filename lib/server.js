
var fs, path, express, Mongoose, invocation, Store, Auth, Points, log_dir;

fs = require('fs');
path = require('path');
express = require('express');
Mongoose = require('mongoose');
invocation = require('commander');
Store = require('connect-redis')(express);

server = express.createServer();

/****************\
* Database config
\****************/

Mongoose.connect('mongodb://localhost/lietome');
require('./models').define(server);

/*************************\
* Middleware Configuration
\*************************/

log_dir = process.env['NODE_LOG_DIR'] || './logs';

server.configure(function() {
  server.use(express.favicon(path.resolve(__dirname, '../static/favicon.ico')));
  server.use(express.logger({
    format: 'short',
    stream: fs.createWriteStream( path.resolve(log_dir, 'out.log'), { flags: 'a' } )
  }));
  server.use(express.cookieParser('babelonian secret'));
  server.use(express.session({
    store: new Store(),
    secret: 'babelonian secret',
    cookie: { maxAge: 1000 * 60 * 60 * 6 }  // maxAge in ms => 6 hours
  }));
  server.use(express.bodyParser());
  server.use(require('./auth').enforcer({
    // pages without auth protection
    whitelist: [ '^/([?#].*)?$', '^/login', '^/logout', '^/scripts', '^/styles', '^/images', '^/api' ]
  }));
  server.use(require('./storage').middleware);
  server.use(server.router);
  server.use(express['static'](path.resolve(__dirname, '../static')));
});

server.configure('development', function() {
  server.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
});

/************\
* Controllers
\************/

require('./control-auth').configure(server);
require('./control-app').configure(server);
require('./control-game').configure(server);
require('./control-api').configure(server);
require('./control-admin').configure(server);
require('./storage').configure(server);

/******************\
* Command line args
\******************/

pkg_specs = JSON.parse( fs.readFileSync( path.resolve(__dirname, '../package.json') ) );

invocation.version(pkg_specs.version)
          .option('-p --port [port]', 'listening port for connections')
          .parse(process.argv);

/********\
* Listen
\********/

port = invocation.port || process.env.PORT || 8080;

server.listen(port, function() {
  console.info('Server running at ' + port);
});

exports.server = server;
