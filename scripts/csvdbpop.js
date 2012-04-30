
var fs, path, invocation, async, Mongoose, Fragment, Entity, Person, Vote, models;

fs = require('fs');
path = require('path');
invocation = require('commander');
async = require('async');
Mongoose = require('mongoose');

Mongoose.connect('mongodb://localhost/lietome');
require( path.resolve( __dirname, '../lib/models') ).define(null);

Models = {
  Fragment: Mongoose.model('Fragment'),
  Entity: Mongoose.model('Entity'),
  Person: Mongoose.model('Person'),
  Vote: Mongoose.model('Vote')
};

invocation.version('0.0.1')
          .option('-m, --model <modelname>', 'collection to populate')
          .option('-f, --file <filename>', 'csv file to pull data from')
          .parse(process.argv);

var lines, header, Model;

if (!invocation.model || !invocation.file) {
  console.warn('Both arguments are required');
  console.warn('Look at the --help');
  process.exit(1);
}

if ( !Models[invocation.model] ) {
  console.error('You need to specify a valid model name:', invocation.model);
  process.exit(1);
}
Model = Models[invocation.model];

fs.readFile( invocation.file, function(err, contents) {
  if (err) { console.error('fs error: ', err); process.exit(1); }
  lines = String(contents).split('\n');
  header = lines.shift().split(',');
  async.forEachLimit(lines, 5, function(l, next) {
    var vals, bag, m;
    vals = l.split(',');
    bag = {};
    vals.forEach(function(v, i) {
      bag[ header[i] ] = v;
    });
    m = new Model( bag );
    m.save(function(err) {
      if (err) { console.error('db error: ', err); }
      next();
    });
  }, function(err) {
    if (err) { console.error('db error: ', err); process.exit(1); }
    console.info('Done populating', invocation.model, 'collection');
    process.exit(0);
  });
});
