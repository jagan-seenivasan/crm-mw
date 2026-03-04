const mongoose = require('mongoose');
const env = require('./env');

async function connectDB() {
  if (!env.mongoUri) {
    throw new Error('MONGO_URI is missing');
  }
  await mongoose.connect(env.mongoUri);
  console.log('MongoDB connected');
}

module.exports = connectDB;
