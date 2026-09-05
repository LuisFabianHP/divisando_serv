const NodeEnvironment = require('jest-environment-node').TestEnvironment;
const { MongoMemoryServer } = require('mongodb-memory-server');

class MongoMemoryEnvironment extends NodeEnvironment {
  async setup() {
    await super.setup();
    this.mongod = await MongoMemoryServer.create();
    const mongoUri = this.mongod.getUri();
    this.global.process.env.MONGO_URI = mongoUri;
    process.env.MONGO_URI = mongoUri;
  }

  async teardown() {
    await this.mongod.stop();
    await super.teardown();
  }
}

module.exports = MongoMemoryEnvironment;
