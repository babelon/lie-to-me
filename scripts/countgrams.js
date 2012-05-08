
var path, async, Mongoose, Fragment, Entity, Person, Vote;

path = require('path');

_ = require('underscore');
async = require('async');
Mongoose = require('mongoose');

Mongoose.connect('mongodb://localhost/lietome');
require( path.resolve( __dirname, '../lib/models') ).define(null);

Fragment = Mongoose.model('Fragment');
Entity = Mongoose.model('Entity');
Person = Mongoose.model('Person');
Vote = Mongoose.model('Vote');

var unigramcounts, bigramcounts;

unigramcounts = {};
bigramcounts = {};

function add1 (gram, counts) {
  if (gram in counts) {
    counts[gram] += 1;
  } else {
    counts[gram] = 1;
  }
}

Fragment.find({}, function(err, fragments) {
  fragments.forEach(function(fragment) {
    var tokens;
    tokens = fragment.text.split(/\s+/);
    tokens.forEach(function(tok) {
      add1(tok, unigramcounts);
    });
    _.zip(tokens.slice(0, tokens.length-1), tokens.slice(1))
    .forEach(function(bigram) {
      add1(bigram, bigramcounts);
    });
  });
  console.log('number of unigrams:', Object.keys(unigramcounts).length);
  console.log('max freq unigrams:', Math.max.apply(Math, _.values(unigramcounts)) );
  console.log('number of bigrams:', Object.keys(bigramcounts).length);
  console.log('max freq bigrams:', Math.max.apply(Math, _.values(bigramcounts)) );
  process.exit(0);
});
