
async = require('async');
Store = require('redis').createClient();

function quit () {
  Store.quit();
}

function startRemoving () {
  Store.keys('sess:*', function(err, replies) {
    if (err) { console.error(err); quit(); return; }
    async.forEachSeries(replies, function(key, next) {
      Store.del(key, next);
    }, function(err) {
      if (err) { console.error(err); quit(); return; }
      console.log('Removed all');
      quit();
    });
  });
}

if (require.main === module) {
  startRemoving();
}
