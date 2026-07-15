const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const masjidRoutes = require("./routes/masjidRoutes");
const preferenceRoutes = require("./routes/preferenceRoutes");
const { connectDatabase } = require("./config/db");

dotenv.config();
connectDatabase();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/.well-known/appspecific/com.chrome.devtools.json", (req, res) => {
  res.status(204).end();
});

app.use("/api/masjids", masjidRoutes);
app.use("/api/preferences", preferenceRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Marakah backend is running.",
  });
});

app.listen(PORT, () => {
  console.log(`Marakah backend running on http://localhost:${PORT}`);
});
