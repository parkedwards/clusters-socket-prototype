const path = require('path');
const express = require('express');

const cluster = require('cluster');
const net = require('net');
const socket = require('socket.io');
const socket_redis = require("socket.io-redis");

const num_workers = require('os').cpus().length;

const PORT = 3000;


if (cluster.isMaster) {

  const Queue = require('./q');
  const rz = new Queue(); // queue!




  // MASTER PROCESS ----------------------------------

  // helper function for spawning workers at index 'i' 
  const spawn = (i) => {
    workers[i] = cluster.fork();
    workers[i].on('exit', (code, signal) => {
      console.log('respawning worker ', i);
      spawn(i);
    });

    // listening for worker messages 
    workers[i].on('message', (msg) => {
      if (msg.type = 'enq') {
        rz.enq(msg.val);
        console.log(rz.storage);
        // workers[i].send({ payload: rz.deq() });
      }
    });


  }

  // helper function for getting worker index based on IP address 
  const worker_index = (ip, len) => {
    let ip_string = '';
    for (let i = 0, _len = ip.length; i < _len; i++) {
      if (!isNaN(ip[i])) ip_string += ip[i];
    }
    return Number(ip_string) % len;
  }

  // array store for workers
  // need to keep them to be able to reference them based on source IP
  const workers = [];

  // spawn workers 
  for (let i = 0; i < num_workers; i++) {
    spawn(i);
  }

  // create the outside facing server listening on our port 
  const server = net.createServer({ pauseOnConnect: true }, (connection) => {

    // we receieved a connection, and we need to pass it to the appropriate worker.
    // get the worker for this connection's source IP and pass it to the connection
    let worker = workers[worker_index(connection.remoteAddress, num_workers)];
    worker.send('sticky-session:connection', connection);
  }).listen(PORT);



} else {

  // WORKER (child) PROCESS

  // note, we don't use a PORT here because the master listens on it for us. 
  let app = new express();

  // express middleware here
  // attach routes here
  app.use(express.static(path.join(__dirname, '../')));
  app.get('/', (req, res) => {
    console.log('Process ' + process.pid + ' answering GET request!');
    res.sendFile(path.join(__dirname, './index.html'));
  });

  // keeping internal server closed to the outside
  let server = app.listen(0, 'localhost')
  let io = socket(server);

  // tells Socket.io to use the redis adapter
  // by default, the redis server = localhost:6379
  // io.adapter(socket_redis({ host: 'localhost', port: 6379 }));
  io.adapter(socket_redis('redis://h:pdfmgatvgam1l4cfu5a9spl09v4@ec2-54-243-251-214.compute-1.amazonaws.com:11959'));


  // socket listeners and middleware here 
  io.on('connection', (socket) => {
    console.log('a user connected with Process ' + process.pid);
    socket.on('disconnect', () => { console.log('user disconnected'); });
    
    socket.on('chat message', (msg) => {
      process.send({ type: 'enq', val: msg }); // message to Master
      
      // socket.broadcast.emit('chat message', msg);
      
      process.on('message', (message) => {
        if (message.payload) {
          console.log('inside listener!');
          socket.broadcast.emit('chat message', message.payload);
        }
      })

    });



  });

  // listen to messages from the master. ignore everything else. 
  process.on('message', (message, connection) => {
    if (message === 'sticky-session:connection') {
      server.emit('connection', connection);
      connection.resume();
    }
  });

}