const net = require('net');

const host = process.env.MONGO_HOST || 'mongodb';
const port = Number(process.env.MONGO_PORT || 27017);
const maxAttempts = Number(process.env.MONGO_WAIT_ATTEMPTS || 60);
const retryDelayMs = Number(process.env.MONGO_WAIT_DELAY_MS || 1000);

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canConnect() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });

    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function main() {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (await canConnect()) {
      console.log(`MongoDB is ready at ${host}:${port}.`);
      return;
    }

    console.log(`Waiting for MongoDB at ${host}:${port} (${attempt}/${maxAttempts})...`);
    await wait(retryDelayMs);
  }

  throw new Error(`MongoDB was not reachable at ${host}:${port} after ${maxAttempts} attempts.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
