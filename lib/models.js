
var Mongoose, Schema;

Mongoose = require('mongoose');
Schema = Mongoose.Schema;

exports.define = function(server) {

  var Entity, Person, Fragment, Vote;

  Entity = new Schema({
    name: { type: String, required: true },
    website: { type: String, validate: /^https?:\/\/.+\..+/ }
  });

  Person = new Schema({
    name: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true, validate: /^.+@.+\..+$/, required: true }
  });

  Fragment = new Schema({
    text: { type: String, trim: true, required: true },
    author: { type: Schema.ObjectId, required: true },
    entity: { type: Schema.ObjectId, required: true },
    truth: { type: Boolean, required: true }
  });

  Vote = new Schema({
    truth: { type: Boolean, required: true },
    fragment: { type: Schema.ObjectId, required: true },
    time: { type: Date, required: true },
    voter: { type: Schema.ObjectId, required: true }
  });

  Mongoose.model('Entity', Entity);
  Mongoose.model('Person', Person);
  Mongoose.model('Fragment', Fragment);
  Mongoose.model('Vote', Vote);

};
