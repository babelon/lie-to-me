
var express, Mongoose, invocation, path, fs;

fs = require('fs');
path = require('path');
express = require('express');
Mongoose = require('mongoose');
invocation = require('commander');

server = express.createServer();

/*************************\
* Middleware Configuration
\*************************/

server.configure(function() {
  server.use(express.logger('tiny'));
  server.use(express.bodyParser());
  server.use(server.router);
  server.use(express['static'](path.resolve(__dirname, '../static')));
});

server.configure('development', function() {
  server.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
});

/****************\
* Database config
\****************/

Mongoose.connect('mongodb://localhost/lietome');
// require('./models').define(server);

/************\
* Controllers
\************/



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

