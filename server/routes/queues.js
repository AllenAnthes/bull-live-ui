const { parse } = require('redis-info');
const express = require('express');

const router = express.Router();

const desiredMetrics = [
  'redis_version',
  'used_memory',
  'mem_fragmentation_ratio',
  'connected_clients',
  'blocked_clients',
];

async function getStats(queue) {
  const client = await queue.client;
  const rawInfo = await client.info();
  const info = parse(rawInfo);

  return desiredMetrics.reduce((metrics, metric) => {
    if (info[metric]) metrics[metric] = info[metric];
    return metrics;
  }, {});
}

const getDataForQueue = async (queue, { page = 0, pageSize = 10, type }) => {
  const parsedPage = Number(page);
  const start = parsedPage * pageSize;
  const parsedPageSize = Number(pageSize);

  const end = parsedPage * parsedPageSize + parsedPageSize;
  const counts = await queue.getJobCounts(type);
  const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0) || 0;
  const jobs = await queue.getJobs(type, start, end);
  return { data: jobs, page: parsedPage, totalCount };
};

/**
 * Returns the names of all available queues
 */
router.get('/', async (req, res) => {
  const { queues } = req.app.locals;
  return res.json({ queues: Object.keys(queues) });
});

/**
 * Middleware for adding the requested queue to the response object to be
 * used by other handlers
 */
router.use('/:queueId', (req, res, next) => {
  const { queueId } = req.params;
  const queue = req.app.locals.queues[queueId];

  if (!queue) return res.status(404).json({ error: 'queue not found' });

  res.locals.queue = queue;
  return next();
});

/**
 * Returns the requested jobs and the most recent counts for the queue
 */
router.get('/:queueId/jobs', async (req, res) => {
  const { queue } = res.locals;
  // const stats = await getStats(queues);

  const [counts, jobs] = await Promise.all([
    queue.getJobCounts(),
    getDataForQueue(queue, req.query),
  ]);
  return res.json({ counts, jobs });
});

router.delete('/:queueId/jobs', async (req, res) => {
  const { queue } = res.locals;
  const { type } = req.query;

  // for some reason 'wait' is used instead of 'waiting' for cleaning
  // see https://github.com/OptimalBits/bull/issues/1069
  const parsedType = type === 'waiting' ? 'wait' : type;

  await queue.clean(5000, parsedType);
  return res.status(204).send();
});

router.use('/:queueId/jobs/:id', async (req, res, next) => {
  const { queue } = res.locals;
  const { id } = req.params;

  const job = await queue.getJob(id);
  if (!job) return res.status(404).json({ error: 'job not found' });

  res.locals.job = job;
  return next();
});

router.delete('/:queueId/jobs/:id', async (req, res) => {
  try {
    await res.locals.job.remove();
  } catch (ex) {
    console.error('Error trying to remove job, manually moving to failed', ex);
    await res.locals.job.moveToFailed(new Error('Manually failed'), true);
  }
  return res.status(204).send();
});

router.post('/:queueId/jobs/:id/retry', async (req, res) => {
  if (!res.locals.job.failedReason) res.status(400);
  await res.locals.job.retry();
  return res.status(200).send();
});

router.get('/:queueId/counts', async (req, res) => {
  const { queue } = res.locals;
  const counts = await queue.getJobCounts();
  return res.json(counts);
});

router.get('/:queueId/stats', async (req, res) => {
  const { queue } = res.locals;
  const stats = getStats(queue);
  return res.json(stats);
});

module.exports = router;
