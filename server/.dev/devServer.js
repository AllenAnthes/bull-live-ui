require('dotenv').config();
const http = require('http');
const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const debug = require('debug')('bull-ui:server');

const Queue = require('bull');

const { router, setQueues, useWebsockets } = require('../index');

const { REDIS_HOST = '127.0.0.1', REDIS_PORT = 6379, REDIS_DB = 0, PORT = '3000' } = process.env;

let redis = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  db: REDIS_DB,
};

const pollLogsQueue = new Queue('poll-logs', { redis });
const notificationsQueue = new Queue('notifications', { redis });

setQueues([pollLogsQueue, notificationsQueue]);

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(router);

/**
 * Get port from environment and store in Express.
 */
const port = normalizePort(PORT);
app.set('port', port);

/**
 * Create HTTP server.
 */
const server = http.createServer(app);

useWebsockets(server);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port, () => {
  console.log(`Listening on ${port}`);
});
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
  const parsedPort = parseInt(val, 10);

  if (isNaN(parsedPort)) {
    // named pipe
    return val;
  }

  if (parsedPort >= 0) {
    // port number
    return parsedPort;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
  debug(`Listening on ${bind}`);
}
