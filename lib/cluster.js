
var cluster, numCPUs, server;

cluster = require('cluster');
numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  // Fork workers.
  for (var i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('death', function(worker) {
    console.warn('worker', worker.pid, 'died');
  });
} else {
  // Worker processes have a server.
  server = require('./server');
}
