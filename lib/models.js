
var Mongoose, Schema;

Mongoose = require('mongoose');
Schema = Mongoose.Schema;

exports.define = function(server) {

  var Entity, Person, Fragment, Vote;

  Entity = new Schema({
    name: { type: String, required: true },
    etype: { type: String, required: true }, // entity type
    website: { type: String, validate: /^https?:\/\/.+\..+/ },
    // categorizing entity
    tier: { type:Number, min: 1 },
    subtype_a: String,
    subtype_b: String,
    // type specific attributes
    location: String,
    artist: String,
    year: Number
  },
  { strict: true });
  Entity.virtual('html_snippet').get(function() {
    var s;
    s = '<a href="' + this.website + '" target="_blank">' + this.name + '</a>';
    s += this.location ? ' in ' + this.location : '';
    s += this.artist ? ' by ' + this.artist : '';
    return s;
  });
  Entity.virtual('type_snippet').get(function() {
    if (this.etype == 'other_food') { return this.subtype_a; }
    return this.etype;
  });
  Entity.virtual('type_actioned').get(function() {
    return actioned_map[ this.etype ];
  });

  Person = new Schema({
    first_name: { type: String, required: true },
    last_name: { type: String },
    gender: { type: String },
    profile_page: { type: String, lowercase: true },
    // email stuff
    email: { type: String, lowercase: true, trim: true, validate: /^.+@.+\..+$/, unique: true, required: true },
    sendupdates: { type: Boolean, default: true, required: true },
    // oauth stuff
    oauth_provider: { type: String, default: 'facebook', required: true },
    oauth_access_token: String,
    oauth_token_expires: Date,
    // facebook stuff
    fb_id: { type: String, unique: true, required: true },
    postactions: { type: Boolean, default: true, required: true },
    // only friends who are our users
    fb_friends: { type: [ Schema.ObjectId ], ref: 'Person', select: false }
  },
  { strict: true });
  Person.virtual('name').get(function() {
    return this.first_name + ' ' + this.last_name;
  });
  Person.virtual('pronoun').get(function() {
    return this.gender === 'female' ? 'she' : 'he';
  });
  Person.virtual('fb_graph_url').get(function() {
    return 'https://graph.facebook.com/' + this.fb_id + '/';
  });
  Person.virtual('open_graph_url').get(function() {
    return 'http://lietome.babelon.co/api/profiles/' + this._id + '/';
  });
  Person.virtual('scores_url').get(function() {
    return "http://scores.babelon.co/scores/" + this._id + '/';
  });
  Person.virtual('html_snippet').get(function() {
    return '<a href="' + this.profile_page + '" target="_blank">' + this.first_name + '</a>';
  });
  Person.methods.picture = function(size) {
    size = size || 'square';
    return this.fb_graph_url + 'picture?type=' + size;
  };

  Fragment = new Schema({
    text: { type: String, trim: true, required: true },
    author: { type: Schema.ObjectId, ref: 'Person', index: true, required: true },
    entity: { type: Schema.ObjectId, ref: 'Entity', index: true, required: true },
    truth: { type: Boolean, required: true },
    rating: { type: Number, min: 0, max: 5, default: 0 }, // five star rating
    created: { type: Date, required: true }
  },
  { strict: true });
  Fragment.virtual('truthiness').get(function() {
    return this.truth ? 'descriptive': 'deceptive';
  });

  Vote = new Schema({
    truth: { type: Boolean, required: true },
    fragment: { type: Schema.ObjectId, ref: 'Fragment', required: true },
    time: { type: Date, required: true },
    voter: { type: Schema.ObjectId, ref: 'Person', index: true, required: true }
  },
  { strict: true });

  Mongoose.model('Entity', Entity);
  Mongoose.model('Person', Person);
  Mongoose.model('Fragment', Fragment);
  Mongoose.model('Vote', Vote);

};

actioned_map = {
  'restaurant': 'been to',
  'other_food': 'been to',
  'movie': 'seen',
  'tv_show': 'watched',
  'book': 'read',
  'place': 'visited',
  'residence': 'lived in',
  'song': 'listened to'
};
