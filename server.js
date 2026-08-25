const path = require("path");
const http = require("http");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const connectDB = require("./config/db.js");
const { ENV } = require("./lib/env.js");
const { initSocket } = require("./lib/socket.js");
const { apiLimiter } = require("./middleware/rateLimit.js");
const authRoutes = require("./routes/authRoutes.js");
const messageRoutes = require("./routes/messageRoutes.js");
const userRoutes = require("./routes/userRoutes.js");
const groupRoutes = require("./routes/groupRoutes.js");

if (!ENV.JWT_SECRET) {
  console.error("JWT_SECRET is required in production");
  process.exit(1);
}

if (!ENV.MONGO_URI) {
  console.error("MONGO_URI is required");
  process.exit(1);
}

const app = express();
const server = http.createServer(app);

initSocket(server);

app.set("trust proxy", 1);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "ws:", "wss:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: ENV.NODE_ENV === "production" ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: ENV.CLIENT_URL,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use("/api", apiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/messages", messageRoutes);

app.get("/", (_req, res) => {
  res.render("auth", { title: "linkSpace — Seal In" });
});

app.get("/app", (_req, res) => {
  res.render("chat", { title: "linkSpace — Secure Channel" });
});

app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ message: "Not found" });
  }
  res.status(404).send("Not found");
});

async function start() {
  await connectDB();
  server.listen(ENV.PORT, () => {
    console.log(`linkSpace running on http://localhost:${ENV.PORT}`);
  });
}

start();
