import fastify, { FastifyInstance } from 'fastify';

// Initialize a Fastify application instance with logging enabled
const app: FastifyInstance = fastify({ logger: true });

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