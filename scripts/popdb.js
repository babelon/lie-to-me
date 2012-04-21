
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
var p1, p2;
p1 = new Person({
  name: 'Brian Tolkin',
  email: 'brian@babelon.co'
});
p1.save(function(err, d) {
  if (err) { console.error(err); }
  p2 = new Person({
    name: 'Aaron Kalb',
    email: 'aaron@babelon.co'
  });
  p2.save(function(err, d) {
    if (err) { console.error(err); }
    // Make two businesses
    var  b1, b2;
    b1 = new Entity({
      name: 'Mantra',
      address: '123 University Ave, Palo Alto, CA'
    })
    b1.save(function(err, d) {
      if (err) { console.error(err); }
      b2 = new Entity({
        name: 'Sushi Tomo',
        address: '420 Bryant Ave, San Francisco, CA'
      })
      b2.save(function(err, d) {
        if (err) { console.error(err); }
        // And two reviews
        var r1, r2;
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
            text: 'The sushi here is freaking amazong! Thank you for the help.',
            author: p2,
            truth: false
          });
          r2.save(function(err, d) {
            console.log('all done loading into db')
          });
        });
      });
    });
  });
});
