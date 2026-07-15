const mongoose = require("mongoose");

async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.log(
      "MONGODB_URI not set. Falling back to local JSON events database.",
    );
    return;
  }

  try {
    await mongoose.connect(mongoUri, {
      dbName: process.env.MONGODB_DB_NAME || "marakah",
    });
    console.log("MongoDB connected for masjid events.");
  } catch (error) {
    console.error(
      "MongoDB connection failed, using JSON fallback:",
      error.message,
    );
  }
}

module.exports = {
  connectDatabase,
};
