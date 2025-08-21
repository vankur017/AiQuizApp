const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const fetch = require("node-fetch");
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
    console.log("📌 Raw LLM Response from FastAPI:", JSON.stringify(json, null, 2));

    if (json.quiz?.questions?.length) return json.quiz.questions;
    if (Array.isArray(json) && json.length) return json;
    return [];
  } catch (error) {
    console.error("❌ Error fetching quiz from LLM:", error);
    return [];
  }
}

// --- Admin Route: Create Quiz and Room ---
app.post("/admin/create-quiz", async (req, res) => {
  console.log("📌 Incoming Create Quiz Request:", req.body.inputType, req.body.data);

  try {
    const questions = await getQuizFromLLM(req.body.inputType, req.body.data);
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

    // ✅ Automatically send first question after creation
    setTimeout(() => {
      sendNextQuestion(io, quizId);
    }, 1000);

    return res.json({ quizId });
  } catch (err) {
    console.error("❌ Admin Create Quiz Error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// --- New Route: Fetch quiz state ---
app.get("/quiz/:quizId", (req, res) => {
  const { quizId } = req.params;
  const room = rooms[quizId];

  if (!room) {
    return res.status(404).json({ error: "Quiz not found" });
  }

  res.json({
    quizId,
    currentQuestionIndex: room.currentQuestionIndex,
    currentQuestion: room.currentQuestion,
    leaderboard: Object.values(room.users),
    totalQuestions: room.questions.length,
  });
});

// --- Socket.IO Quiz Flow ---
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // socket.on("join_room", ({ quizId, username }) => {
  //   if (!rooms[quizId]) {
  //     socket.emit("error", "Invalid quiz ID");
  //     return;
  //   }

  //   rooms[quizId].users[socket.id] = { username, score: 0 };
  //   socket.join(quizId);

  //   io.to(quizId).emit("leaderboard_update", Object.values(rooms[quizId].users));
  //   console.log(`✅ ${username} joined quiz ${quizId}`);
  // });

socket.on("join_room", ({ quizId, username }) => {
  if (!rooms[quizId]) {
    socket.emit("error", "Invalid quiz ID");
    return;
  }

  // ✅ Check if the username already exists in the room
  const userExists = Object.values(rooms[quizId].users).some(
    (user) => user.username === username
  );

  if (userExists) {
    socket.emit("error", "User already joined with this name");
    console.log(`❌ Duplicate join attempt by ${username} in quiz ${quizId}`);
    return;
  }

  // Otherwise add the new user
  rooms[quizId].users[socket.id] = {
    username,
    score: 0,
    currentQuestionIndex: 0, // ✅ per-user state
  };

  socket.join(quizId);

  io.to(quizId).emit("leaderboard_update", Object.values(rooms[quizId].users));
  console.log(`✅ ${username} joined quiz ${quizId}`);

  // ✅ Send Q1 only to this new user
  const firstQuestion = rooms[quizId].questions[0];
  socket.emit("new_question", firstQuestion);
});



  socket.on("start_quiz", ({ quizId }) => {
    const room = rooms[quizId];
    sessionStorage.setItem("quizId", quizId);
    if (!room) {
      socket.emit("error", "Invalid quiz ID");
      return;
    }

    room.currentQuestionIndex = 0;
    room.currentQuestion = null;
    sendNextQuestion(io, quizId);
  });

  // socket.on("submit_answer", ({ quizId, questionId, answer }) => {
  //   const room = rooms[quizId];
  //   if (!room) return;

  //   const user = room.users[socket.id];
  //   if (!user || room.currentQuestion?.id !== questionId) return;

  //   if (answer === room.currentQuestion.correctAnswer) {
  //     user.score += 10;
  //   }

  //   io.to(quizId).emit("leaderboard_update", Object.values(room.users));
  // });

  socket.on("submit_answer", ({ quizId, questionId, answer }) => {
  const room = rooms[quizId];
  if (!room) return;

  const user = room.users[socket.id];
  if (!user) return;

  const currentQ = room.questions[user.currentQuestionIndex];
  if (!currentQ || currentQ.id !== questionId) return;

  if (answer === currentQ.correctAnswer) {
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

  // socket.on("next_question", ({ quizId }) => {
  //   const room = rooms[quizId];
  //   if (!room) return;
  //   room.currentQuestionIndex++;
  //   sendNextQuestion(io, quizId);
  // });

  socket.on("next_question", ({ quizId }) => {
  const room = rooms[quizId];
  if (!room) return;

  const user = room.users[socket.id];
  if (!user) return;

  user.currentQuestionIndex++;
  if (user.currentQuestionIndex >= room.questions.length) {
    socket.emit("quiz_end", { score: user.score });
    return;
  }

  const nextQ = room.questions[user.currentQuestionIndex];
  socket.emit("new_question", nextQ); // ✅ send only to this user
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

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Backend running on ${PORT}`));
