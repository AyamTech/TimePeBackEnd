const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

beforeAll(async () => {
  jest.setTimeout(30000);

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // 🔥 FORCE connection early
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
