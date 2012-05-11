
var path, fs, Promise, p;

path = require('path');
fs = require('fs');

Promise = require( path.resolve( __dirname, '../lib/defers' ) ).Promise;

function doAsync(fname) {
  var promise = new Promise();
  fs.readFile(fname, function(err, contents) {
    if (err) { console.error(err); promise.stalled(err); }
    else {
      promise.onward( path.resolve( __dirname, 'testpromise.js') );
    }
  });
  promise.name = 'doAsnyc';
  return promise;
}

function doAnotherAsync(fname) {
  var promise = new Promise();
  fs.readFile(fname, function(err, contents) {
    if (err) { console.error(err); promise.stalled(err); }
    else {
      promise.onward(contents);
    }
  });
  promise.name = 'doAnotherAsync';
  return promise;
}


if (require.main === module) {
  p = doAsync( path.resolve( __dirname, 'testpromise.js') );
  p.then(doAsync);
  p.then(doAnotherAsync);
  p.then(function(s) {
    console.log('success', String(s).length);
  });
  p.error(function(err) {
    console.error('error', err);
  });
}
