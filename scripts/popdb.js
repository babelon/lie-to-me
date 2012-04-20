
var path, Mongoose, Review, Business, Author;

path = require('path');
Mongoose = require('mongoose');

Mongoose.connect('mongodb://localhost/lietome');
require( path.resolve( __dirname, '../lib/models') ).define(null);

Review = Mongoose.model('Review');
Business = Mongoose.model('Business');
Author = Mongoose.model('Author');

Author.findOne(function(err, a) {
  var bi = new Business({
    name: 'Mantra',
    address: '174 California Ave, Palo Alto, CA 94303'
  })
  bi.save(function(err, b) {
    var r = new Review({
      text: 'Casual Indian food restaurant that is frankly just not that good. The food was just meh, the service was only OK, and the menu seemed limiting. I know other people have had good experiences here, but I would definitely go to other Indian restaurants in Palo Alto over this one.',
      author: a,
      about: b
    });
    console.log(r);
    r.save(function(err) { console.log('done', err) });
  });
});
