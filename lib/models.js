
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
    website: { type: String, validate: /^https?::\/\/.+\..+/, required: true }
  });

  Person = new Schema({
    name: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true, validate: /^.+@.+\..+$/, required: true }
  });

  Vote = new Schema({
    truth: { type: Boolean, required: true },
    fragment: { type: Schema.ObjectId, required: true },
    time: { type: Date, required: true },
    voter: { type: Schema.ObjectId, required: true }
  });

  Mongoose.model('Fragment', Fragment);
  Mongoose.model('Entity', Entity);
  Mongoose.model('Person', Person);
  Mongoose.model('Vote', Vote);

};
