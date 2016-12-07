const express = require('express');
const cluster = require('cluster');
const numWorkers = require('os').cpus().length;

const factorial = (num) => {
  if (num === 1 || num === 0) return 1;
  else return num * factorial(num - 1);
};

if (cluster.isMaster) {
  
  console.log('Master cluster setting up ' + numWorkers + ' workers...');

  
  // Makes the workers 
  // Attaches the primary master -> worker messaging listener
  for (let i = 0; i < numWorkers; i++) {
    let worker = cluster.fork();
    worker.on('message', function (message) {
      console.log(message.from + ': ' + message.type + ' ' + message.data.number + ' = ' + message.data.result);
    });
  }

  // listener for when each worker comes onlinee 
  cluster.on('online', function (worker) {
    // console.log('Worker ' + worker.process.pid + ' is online');
  });

  // Sends message TO WORKERS from master
  // iterates through the 'cluster.workers' object (confirmed after checking docs)
  for (let wid in cluster.workers) {
    cluster.workers[wid].send({
      type: 'factorial',
      from: 'master',
      data: {
        number: Math.floor(Math.random() * 50)
      }
    });
  }

  cluster.on('exit', function (worker, code, signal) {
    console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
    console.log('Starting a new worker');

    let newWorker = cluster.fork();
    newWorker.on('message', (message) => {
      console.log(message.from + ': ' + message.type + ' ' + message.data.number + ' = ' + message.data.result);
    });
  });

} else {
  const app = express();
  process.on('message', function (message) {
    if (message.type === 'factorial') {
      process.send({
        type: 'factorial',
        from: 'Worker ' + process.pid,
        data: {
          number: message.data.number,
          result: factorial(message.data.number)
        }
      });
    }
  });

  app.listen(3000, () => {});
}