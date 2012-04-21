
var Mongoose, Schema;

Mongoose = require('mongoose');
Schema = Mongoose.Schema;

exports.define = function(server) {

  var Fragment, Entity, Person, Vote;

  Fragment = new Schema({
    text: { type: String, trim: true, required: true },
    author: { type: Schema.ObjectId, required: true },
    entity: { type: Schema.ObjectId, required: true },
    truth: { type: Boolean, required: true }
  });

  Entity = new Schema({
    name: { type: String, required: true },
    address: String
  });

  Person = new Schema({
    name: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true, validate: /^.+@.+\..+$/, required: true }
  });

  Vote = new Schema({
    truth: { type: Boolean, required: true },
    fragment: Schema.ObjectId,
    voter: Schema.ObjectId
  });

  Mongoose.model('Fragment', Fragment);
  Mongoose.model('Entity', Entity);
  Mongoose.model('Person', Person);
  Mongoose.model('Vote', Vote);

};
