
var fs, Mongoose, Mustache, Store, Fragment, Entity, Person, Vote, Promise, Utilities;

fs = require('fs');

Mongoose = require('mongoose');
Mustache = require('mustache');

Fragment = Mongoose.model('Fragment');
Entity = Mongoose.model('Entity');
Person = Mongoose.model('Person');
Vote = Mongoose.model('Vote');

Promise = require('./defers').Promise;
Storage = require('./storage');
Utilities = require('./utilities');

exports.queueup = function(req, res, vote, fragment) {
  var promise = new Promise();
  
  return promise;
}
