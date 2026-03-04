const mongoose = require('mongoose');
const env = require('../src/config/env');
const { Stage } = require('../src/models');

async function run() {
  if (!env.mongoUri) {
    throw new Error('MONGO_URI is missing');
  }

  await mongoose.connect(env.mongoUri);
  console.log('MongoDB connected');

  const collection = Stage.collection;
  const indexes = await collection.indexes();
  const oldIndex = indexes.find((idx) => idx.name === 'tenantId_1_order_1');

  if (oldIndex) {
    await collection.dropIndex('tenantId_1_order_1');
    console.log('Dropped old index: tenantId_1_order_1');
  } else {
    console.log('Old index not found: tenantId_1_order_1');
  }

  await Stage.syncIndexes();
  const updated = await collection.indexes();
  console.log('Stage indexes synced:', updated.map((i) => i.name).join(', '));

  await mongoose.disconnect();
  console.log('Done');
}

run().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
    // no-op
  }
  process.exit(1);
});
