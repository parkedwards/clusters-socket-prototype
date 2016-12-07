const path = require('path');
const express = require('express');
const cluster = require('cluster');
const num_workers = require('os').cpus().length;

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const PORT = 3000;

if (cluster.isMaster) {
  // MASTER PROCESS

  console.log('Master cluster setting up ' + num_workers + ' workers...');

  for (let i = 0; i < num_workers; i++) {
    let worker = cluster.fork(); // method to create worker
  }

  cluster.on('online', (worker) => {
    console.log('Worker ' + worker.process.pid + ' is online');
  });

  cluster.on('exit', (worker, code, signal) => {
    console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
    console.log('Starting a new worker');
    cluster.fork();
  });




} else {
  // WORKER (child) PROCESS

  io.on('connection', (socket) => {
    console.log('a user connected with Process ' + process.pid);

    socket.on('disconnect', () => { console.log('user disconnected'); });

    socket.on('chat message', (msg) => {
      io.emit('chat message', msg);
    })

  });

  app.use(express.static(path.join(__dirname, '../')));
  app.get('/', (req, res) => {
    console.log('Process ' + process.pid + ' answering GET request!');
    // res.send('process ' + process.pid + ' says hello!').end();
    res.sendFile(path.join(__dirname, './index.html'));
    // res.end();
  });


  http.listen(3000, () => console.log('Process ' + process.pid + ' listening to all incoming requests'));
}


// io.on('connection', (socket) => {
//   console.log('a user connected with Process ' + process.pid);

//   socket.on('disconnect', () => { console.log('user disconnected'); });

//   socket.on('chat message', (msg) => {
//     io.emit('chat message', msg);
//   })

// });

// app.use(express.static(path.join(__dirname, '../')));
// app.get('/', (req, res) => {
//   console.log('Process ' + process.pid + ' answering GET request!');
//   // res.send('process ' + process.pid + ' says hello!').end();
//   res.sendFile(path.join(__dirname, './index.html'));
// });
// http.listen(3000, () => console.log('Process ' + process.pid + ' listening to all incoming requests'));