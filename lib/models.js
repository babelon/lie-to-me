
var Mongoose, Schema;

Mongoose = require('mongoose');
Schema = Mongoose.Schema;

exports.define = function(server) {

  var Review, Business, Author;

  Review = new Schema({
    text: { type: String, trim: true, required: true },
    author: { type: Schema.ObjectId, required: true },
    about: { type: Schema.ObjectId, required: true }
  });

  Business = new Schema({
    name: { type: String, required: true },
    address: String
  });

  Author = new Schema({
    name: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true, validate: /^.+@.+\..+$/, required: true }
  });

  Mongoose.model('Review', Review);
  Mongoose.model('Business', Business);
  Mongoose.model('Author', Author);

};
