const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("node:path");
const multer = require("multer");
const masjidRoutes = require("./routes/masjidRoutes");
const restaurantRoutes = require("./routes/restaurantRoutes");
const preferenceRoutes = require("./routes/preferenceRoutes");
const translationRoutes = require("./routes/translationRoutes");
const youtubeRoutes = require("./routes/youtubeRoutes");
const { connectDatabase } = require("./config/db");

dotenv.config();
const PORT = process.env.PORT || 3001;

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"), {
      maxAge: "7d",
      fallthrough: true,
    }),
  );

  app.get("/.well-known/appspecific/com.chrome.devtools.json", (req, res) => {
    res.status(204).end();
  });

  app.use("/api/masjids", masjidRoutes);
  app.use("/api/restaurants", restaurantRoutes);
  app.use("/api/preferences", preferenceRoutes);
  app.use("/api/translation", translationRoutes);
  app.use("/api/translations", translationRoutes);
  app.use("/api/youtube", youtubeRoutes);

  app.use((error, req, res, next) => {
    if (
      error instanceof multer.MulterError &&
      error.code === "LIMIT_FILE_SIZE"
    ) {
      return res.status(400).json({
        success: false,
        message: "Image must be smaller than 5 MB.",
      });
    }

    return next(error);
  });

  app.get("/api/health", (req, res) => {
    res.status(200).json({
      success: true,
      message: "Marakah backend is running.",
    });
  });

  return app;
}

function startServer() {
  connectDatabase();
  const app = createApp();
  return app.listen(PORT, () => {
    console.log(`Marakah backend running on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createApp,
  startServer,
};
