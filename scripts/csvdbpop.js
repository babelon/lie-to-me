
var fs, path, invocation, async, Mongoose, Fragment, Entity, Person, Vote, models;

fs = require('fs');
path = require('path');
invocation = require('commander');
async = require('async');
_ = require('underscore');
Mongoose = require('mongoose');

invocation.version('0.0.1')
          .option('-m, --model <modelname>', 'collection to populate')
          .option('-f, --file <filename>', 'csv file to pull data from')
          .parse(process.argv);

Mongoose.connect('mongodb://localhost/lietome');
require( path.resolve( __dirname, '../lib/models') ).define(null);

Models = {
  'Fragment': Mongoose.model('Fragment'),
  'Entity': Mongoose.model('Entity'),
  'Person': Mongoose.model('Person'),
  'Vote': Mongoose.model('Vote')
};

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
    // horrible, HACKY quoted csv parsing
    // use single quotes in csv file if needed
    var vals, bag, m, end;
    vals = []
    quoted_pat = /"(.*?)"[,$]/;
    while ( true ) {
      if (l[0] == '"') {
        l = l.substr(1);
        end = l.indexOf('"');
        vals.push( l.substring(0, end) );
        l = l.substr( end + 2 );
        if (!l) { break; }
      } else {
        end = l.indexOf(',');
        if (end != -1) {
          vals.push( l.substring(0, end) );
          l = l.substr( end + 1 );
        } else {
          vals.push( l.substring(0, l.length) );
          break;
        }
      }
    }
    if (header.length != vals.length) {
      console.error(' CSV parsing error:', header, vals);
      process.exit(1);
    }
    bag = {};
    async.forEachSeries( _.zip(header, vals), function(hv, nextval) {

      // bag construction
      hv[0] = hv[0].trim();
      hv[1] = hv[1].trim();
      if (!!hv[1]) {
        switch (hv[0]) {
          case 'NOTE':
            nextval();
            break;
          case 'tier':
          case 'year':
          case 'rating':
            bag[ hv[0] ] = Number(hv[1]);
            nextval();
            break;
          case 'author':
            Models['Person'].findOne( { 'email': hv[1] }, function(err, person) {
              if (err || !person) { console.error('db error: ', err, hv[1], person); }
              bag[ hv[0] ] = person._id;
              nextval();
            });
            break;
          case 'entity':
            Models['Entity'].findOne( { 'name': hv[1] }, function(err, entity) {
              if (err || !entity) { console.error('db error: ', err, hv[1], entity); }
              bag[ hv[0] ] = entity._id;
              nextval();
            });
            break;
          default:
            bag[ hv[0] ] = hv[1];
            nextval();
        }
      } else {
        nextval();
      }

    }, function(err) {
      if (err) { console.error('db error: ', err); process.exit(1); }

      // model creation
      m = new Model( bag );
      m.save(function(err) {
        if (err) { console.error('db error: ', err); }
        next();
      });

    });
  }, function(err) {
    if (err) { console.error('db error: ', err); process.exit(1); }
    console.info('Done populating', invocation.model, 'collection');
    process.exit(0);
  });
});
