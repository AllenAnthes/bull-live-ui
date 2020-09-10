const path = require('path');
const http = require('http');

const express = require('express');
const socketIo = require('socket.io');
const throttle = require('lodash/throttle');

const queuesRouter = require('./routes/queues');

const bullUI = express();
exports.bullUI = bullUI;

bullUI.use(express.static(path.join(__dirname, 'public')));

const queues = {};
bullUI.locals.queues = queues;

bullUI.use('/queues', queuesRouter);

exports.setQueues = (bullQueues) => {
  bullQueues.forEach((queue) => {
    queues[queue.name] = queue;
  });
};

/**
 * Must be called AFTER queues have been set via `setQueues`
 *
 * @param app    Express app that an http server will be bound to
 * @param server Optionally provided server
 */
exports.useBullUIWebsockets = ({ app, server }) => {
  if (!server) {
    server = http.createServer(app);
  }
  const io = socketIo(server);

  io.on('connection', (socket) => {
    // console.debug('New client connected');

    socket.on('subQueue', async ({ queueName }, callback) => {
      // console.debug(`client subscribed to queue: ${queueName}`);
      socket.join(queueName);

      // give the client the most recent counts as part of our ACK
      const counts = await queues[queueName].getJobCounts();
      callback({ counts });
    });

    socket.on('unsubQueue', ({ queueName }) => {
      // console.debug(`client unsubscribed to queue: ${queueName}`);
      socket.leave(queueName);
    });
  });

  // subscribe to `progress` events coming from any bull queue
  Object.entries(queues).forEach(([queueName, queue]) => {
    // send a message to any clients subscribed to a particular queue,
    // notifying them that there is new data and giving them the current counts
    const throttledProgress = throttle(async () => {
      const counts = await queue.getJobCounts();
      // console.log(`progress ${queueName}`);
      io.to(queueName).emit('progress', { counts });
    }, 1500);

    queue.on('global:progress', throttledProgress);
  });
  return { server, app, io };
};
