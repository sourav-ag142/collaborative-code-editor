import dotenv from "dotenv";
dotenv.config({ path: "backend/.env" });
import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (
    origin === "http://localhost:5173" ||
    origin === "http://127.0.0.1:5173"
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

console.log(
  "Backend API key loaded:",
  Boolean(process.env.CODE_API_KEY),
  "Length:",
  process.env.CODE_API_KEY?.trim().length
);
app.post("/api/run", async (req, res) => {
    try {
        const { code, language, input = "" } = req.body;

        const compilerIds = {
            javascript: "nodejs-24",
            python: "python-3.14",
            java: "openjdk-25",
            cpp: "g++-15",
        };

        if (typeof code !== "string" || !compilerIds[language]) {
            return res.status(400).json({
                error: "Invalid code or language",
            });
        }

        const response = await fetch(
            "https://api.onlinecompiler.io/api/run-code-sync/",
            {
                method: "POST",
                headers: {
                    Authorization: process.env.CODE_API_KEY?.trim(),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    compiler: compilerIds[language],
                    code,
                    input,
                    time_limit: 10,
                }),
            }
        );

        const result = await response.json();
        return res.status(response.status).json(result);
    } catch (error) {
        console.error("Code execution failed:", error.message);
        return res.status(500).json({
            error: "Unable to execute code. Please try again.",
        });
    }
});

const server = http.createServer(app);

const allowedOrigins = [
    "http://localhost:5173",
    process.env.CLIENT_URL,
].filter(Boolean);

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
    },
});

// Room membership: room ID -> Map(socket ID, username)
const rooms = new Map();

// Shared editor state: room ID -> { code, language }
const roomStates = new Map();

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

function broadcastUsers(roomId) {
    const users = rooms.get(roomId);

    io.to(roomId).emit(
        "userJoined",
        users ? Array.from(users.values()) : []
    );
}

function removeFromRoom(socket) {
    const roomId = socket.data.roomId;

    if (!roomId) return;

    const users = rooms.get(roomId);

    if (users) {
        users.delete(socket.id);

        if (users.size === 0) {
            rooms.delete(roomId);
            roomStates.delete(roomId);
        } else {
            broadcastUsers(roomId);
        }
    }

    socket.leave(roomId);
    socket.data.roomId = null;
    socket.data.userName = null;
}

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join", ({ roomId, userName } = {}) => {
        if (
            typeof roomId !== "string" ||
            typeof userName !== "string" ||
            !roomId.trim() ||
            !userName.trim()
        ) {
            socket.emit("appError", "Room ID and username are required.");
            return;
        }

        roomId = roomId.trim();
        userName = userName.trim();

        // Leave the previous room if necessary.
        removeFromRoom(socket);

        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Map());
        }

        if (!roomStates.has(roomId)) {
            roomStates.set(roomId, {
                code: "// start code here",
                language: "javascript",
            });
        }

        socket.join(roomId);

        socket.data.roomId = roomId;
        socket.data.userName = userName;

        rooms.get(roomId).set(socket.id, userName);

        // Send the current editor state to the joining user only.
        socket.emit("roomState", roomStates.get(roomId));

        // Update the user list for everyone in the room.
        broadcastUsers(roomId);

        console.log(`${userName} joined room ${roomId}`);
    });

    socket.on("codeChange", ({ code } = {}) => {
        const roomId = socket.data.roomId;

        if (!roomId || typeof code !== "string") return;

        const state = roomStates.get(roomId);

        if (!state) return;

        state.code = code;

        // Send the change to other users in this room.
        socket.to(roomId).emit("codeUpdate", code);
    });

    socket.on("languageChange", ({ language } = {}) => {
        const roomId = socket.data.roomId;

        const supportedLanguages = [
            "javascript",
            "python",
            "java",
            "cpp",
        ];

        if (
            !roomId ||
            !supportedLanguages.includes(language)
        ) {
            return;
        }

        const state = roomStates.get(roomId);

        if (!state) return;

        state.language = language;

        socket.to(roomId).emit("languageUpdate", language);
    });

    socket.on("typing", () => {
        const roomId = socket.data.roomId;
        const userName = socket.data.userName;

        if (!roomId || !userName) return;

        socket.to(roomId).emit("userTyping", userName);
    });

    socket.on("leaveRoom", () => {
        removeFromRoom(socket);
    });

    socket.on("disconnect", () => {
        removeFromRoom(socket);
        console.log("User disconnected:", socket.id);
    });
});

const port = process.env.PORT || 5001;

server.listen(port, "0.0.0.0", () => {
    console.log(`Server is running on port ${port}`);
});
