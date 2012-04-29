
var path, Mongoose, Fragment, Entity, Person, Vote;

path = require('path');
Mongoose = require('mongoose');

Mongoose.connect('mongodb://localhost/lietome');
require( path.resolve( __dirname, '../lib/models') ).define(null);

Fragment = Mongoose.model('Fragment');
Entity = Mongoose.model('Entity');
Person = Mongoose.model('Person');
Vote = Mongoose.model('Vote');

// Make two people
var b1, b2, r1, r2;

// Make two businesses
b1 = new Entity({
  name: 'Mantra',
  website: 'http://www.mantrapa.com/'
})
b1.save(function(err, d) {
  if (err) { console.error(err); }
  b2 = new Entity({
    name: 'Sushi Tomo',
    website: 'http://www.yelp.com/biz/sushi-tomo-palo-alto-2/'
  })
  b2.save(function(err, d) {
    if (err) { console.error(err); }
    // And two reviews
    r1 = new Fragment({
      entity: b1,
      text: 'Casual Indian food restaurant that is frankly just not that good. The food was just meh, the service was only OK, and the menu seemed limiting. I know other people have had good experiences here, but I would definitely go to other Indian restaurants in Palo Alto over this one.',
      author: p1,
      truth: true
    });
    r1.save(function(err, d) {
      if (err) { console.error(err); }
      r2 = new Fragment({
        entity: b2,
        text: 'Rolls here are pretty good. I went here on a date and the atmosphere wasn’t really what I expect. Normally for sushi I anticipate a smaller, Asian-style restaurant, but this seemed more American. Sushi itself was pretty good. Fish seemed pretty fresh and had some cool, unique rolls. Overall, I would for sure come back with a bunch of friends, but definitely not for a date. Also, would like to try things besides the sushi because they seemed pretty interesting. For sushi, had a very good price point. Point of note: make sure to understand what is in the crab rolls before ordering because some are imitation crab and some are real crab.',
        author: p2,
        truth: false
      });
      r2.save(function(err, d) {
        console.log('all done loading into db');
        process.exit(0);
      });
    });
  });
});
