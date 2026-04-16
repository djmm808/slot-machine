import fastify, { FastifyInstance } from 'fastify';
import { generateSeed, hashSeed, combineSeeds, seededRandom } from './crypto';

// Initialize a Fastify application instance with logging enabled
const app: FastifyInstance = fastify({ logger: true });

// In-memory storage for seed pairs (in production, use a database)
const seedStorage = new Map<string, { clientSeedHash: string; serverSeed: string; serverSeedHash: string; timestamp: number }>();

// Health check endpoint
app.get('/api/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// CORS support
app.addHook('onRequest', (request, reply, done) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type');
  done();
});

/**
 * POST /api/provably-fair/commit
 * Client commits their seed hash before spinning
 * Body: { clientSeedHash: string }
 * Returns: { sessionId: string, serverSeedHash: string }
 */
app.post('/api/provably-fair/commit', async (request, reply) => {
  const { clientSeedHash } = request.body as { clientSeedHash: string };
  
  if (!clientSeedHash) {
    return reply.code(400).send({ error: 'clientSeedHash is required' });
  }
  
  // Generate server seed and its hash
  const serverSeed = generateSeed();
  const serverSeedHash = hashSeed(serverSeed);
  
  // Generate a unique session ID
  const sessionId = generateSeed().substring(0, 16);
  
  // Store the seed pair
  seedStorage.set(sessionId, {
    clientSeedHash,
    serverSeed,
    serverSeedHash,
    timestamp: Date.now()
  });
  
  return { sessionId, serverSeedHash };
});

/**
 * POST /api/provably-fair/reveal
 * Server reveals the server seed after the spin
 * Body: { sessionId: string, clientSeed: string }
 * Returns: { serverSeed: string, combinedSeed: string, verified: boolean }
 */
app.post('/api/provably-fair/reveal', async (request, reply) => {
  const { sessionId, clientSeed } = request.body as { sessionId: string; clientSeed: string };
  
  if (!sessionId || !clientSeed) {
    return reply.code(400).send({ error: 'sessionId and clientSeed are required' });
  }
  
  const seedData = seedStorage.get(sessionId);
  
  if (!seedData) {
    return reply.code(404).send({ error: 'Session not found' });
  }
  
  // Verify the client seed matches the committed hash
  const clientSeedHash = hashSeed(clientSeed);
  const verified = clientSeedHash === seedData.clientSeedHash;
  
  if (!verified) {
    return reply.code(400).send({ error: 'Client seed hash does not match committed hash', verified: false });
  }
  
  // Combine seeds
  const combinedSeed = combineSeeds(clientSeed, seedData.serverSeed);
  
  // Clean up the session after reveal
  seedStorage.delete(sessionId);
  
  return {
    serverSeed: seedData.serverSeed,
    combinedSeed,
    verified: true
  };
});

/**
 * GET /api/provably-fair/verify
 * Verify a spin result using the combined seed
 * Query: { combinedSeed: string, index: number }
 * Returns: { randomValue: number }
 */
app.get('/api/provably-fair/verify', async (request, reply) => {
  const { combinedSeed, index } = request.query as { combinedSeed: string; index: string };
  
  if (!combinedSeed || !index) {
    return reply.code(400).send({ error: 'combinedSeed and index are required' });
  }
  
  const randomValue = seededRandom(combinedSeed, parseInt(index));
  
  return { randomValue };
});

// Function to start the Fastify server
const start = async () => {
  try {
    // Attempt to start the server on port 3000 and listen on all network interfaces
    await app.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server running on http://localhost:3000'); // Log a message when the server starts
  } catch (err) {
    // If an error occurs during startup, log the error and exit the process
    app.log.error(err);
    process.exit(1);
  }
};

// Start the server
start();