import "./env.js";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRoutes } from "./routes/auth.js";
import { userRoutes } from "./routes/users.js";
import { showRoutes } from "./routes/shows.js";
import { attendanceRoutes } from "./routes/attendance.js";
import { signInRoutes } from "./routes/signIn.js";
import { organizationRoutes } from "./routes/organizations.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ?? 3001;
const isProd = process.env.NODE_ENV === "production";
app.use(cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:5173",
    credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/shows", showRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/sign-in", signInRoutes);
app.use("/api/organizations", organizationRoutes);
app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
});
if (isProd) {
    const clientDir = path.join(__dirname, "../../client/dist");
    app.use(express.static(clientDir));
    app.get("*", (_req, res) => {
        res.sendFile(path.join(clientDir, "index.html"));
    });
}
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
