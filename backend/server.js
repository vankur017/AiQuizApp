const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const fetch = require("node-fetch"); // ✅ clean require for CommonJS
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

const rooms = {}; 
// rooms[quizId] = { users: {}, questions: [], currentQuestionIndex: 0, currentQuestion: null }

// --- Fetch quiz from FastAPI ---
async function getQuizFromLLM(inputType, data) {
  try {
    const res = await fetch("http://localhost:8000/generate-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputType, data }),
    });

    const json = await res.json();
    console.log("📌 Raw LLM Response:", json);

    // Case 1: LLM returns { quiz: { questions: [...] } }
    if (json.quiz?.questions?.length) {
      return json.quiz.questions;
    }

    // Case 2: LLM returns a raw array
    if (Array.isArray(json) && json.length) {
      return json;
    }

    return [];
  } catch (error) {
    console.error("❌ Error fetching quiz from LLM:", error);
    return [];
  }
}


// --- Admin Route: Create Quiz and Room ---
app.post("/admin/create-quiz", async (req, res) => {
  const { inputType, data } = req.body;
  console.log("📌 Incoming Create Quiz Request:", req.body);

  try {
    const questions = await getQuizFromLLM(inputType, data);
    console.log("📌 LLM returned questions:", questions);

    if (!questions.length) {
      console.error("❌ No questions received from LLM service");
      return res.status(500).json({ error: "Failed to generate quiz" });
    }

    const normalizedQuestions = questions.map((q, index) => {
      const correctIndex = q.options.findIndex(
        (opt) => opt.trim().toLowerCase() === q.answer.trim().toLowerCase()
      );
      return {
        id: String(index),
        text: q.question,
        options: q.options,
        correctAnswer: correctIndex >= 0 ? correctIndex : null,
      };
    });

    const quizId = uuidv4();
    rooms[quizId] = {
      users: {},
      questions: normalizedQuestions,
      currentQuestionIndex: 0,
      currentQuestion: null,
    };

    return res.json({ quizId });
  } catch (err) {
    console.error("❌ Admin Create Quiz Error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// --- Socket.IO Quiz Flow ---
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  socket.on("join_room", ({ quizId, username }) => {
    if (!rooms[quizId]) {
      socket.emit("error", "Invalid quiz ID");
      return;
    }

    rooms[quizId].users[socket.id] = { username, score: 0 };
    socket.join(quizId);

    io.to(quizId).emit("leaderboard_update", Object.values(rooms[quizId].users));
    console.log(`✅ ${username} joined quiz ${quizId}`);
  });

  socket.on("start_quiz", ({ quizId }) => {
    if (!rooms[quizId]) {
      socket.emit("error", "Invalid quiz ID");
      return;
    }
    sendNextQuestion(io, quizId);
  });

  socket.on("submit_answer", ({ quizId, questionId, answer }) => {
    const room = rooms[quizId];
    if (!room) return;

    const user = room.users[socket.id];
    if (!user || room.currentQuestion?.id !== questionId) return;

    if (answer === room.currentQuestion.correctAnswer) {
      user.score += 10;
    }

    io.to(quizId).emit("leaderboard_update", Object.values(room.users));
  });

  socket.on("disconnect", () => {
    for (const quizId in rooms) {
      if (rooms[quizId].users[socket.id]) {
        delete rooms[quizId].users[socket.id];
        io.to(quizId).emit("leaderboard_update", Object.values(rooms[quizId].users));
      }
    }
  });
});

// --- Helper: Send Next Question ---
function sendNextQuestion(io, quizId) {
  const room = rooms[quizId];
  if (!room || room.currentQuestionIndex >= room.questions.length) {
    io.to(quizId).emit("quiz_end", Object.values(room.users));
    return;
  }

  const q = room.questions[room.currentQuestionIndex];
  console.log("✅ Sending question:", q.text);
  room.currentQuestion = q;

  io.to(quizId).emit("new_question", q);
}

// Add a new socket event to trigger manually
io.on("connection", (socket) => {
  socket.on("next_question", ({ quizId }) => {
    const room = rooms[quizId];
    if (!room) return;
    room.currentQuestionIndex++;
    sendNextQuestion(io, quizId);
  });
});



const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Backend running on ${PORT}`));
