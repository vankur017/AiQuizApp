# 🧠 AI Multiplayer Quiz App (Prompt-Based)

A real-time, multiplayer quiz game powered by AI. Users can generate quizzes using natural language prompts, join quiz rooms, and compete in real-time with live scoring and leaderboards.

---

## 🚀 Tech Stack

| Layer       | Tech                                          |
|-------------|-----------------------------------------------|
| **Frontend**| Next.js (App Router), TailwindCSS, shadcn/ui, Zustand/Jotai |
| **Backend** | Node.js (Express + Socket.IO)                 |
| **AI/LLM**  | Python (FastAPI) + LM Studio (local model)    |
| **Database**| MongoDB Atlas or Supabase (free tier)         |
| **Realtime**| WebSockets via Socket.IO                      |
| **Deployment** | Vercel (Frontend), Render or Fly.io (Backend) |

---

## 📦 Monorepo Structure


---

## 🧩 Application Flow

1. **Start & User Access**: User opens the web app.
2. **Prompt Generation**: User submits a quiz prompt (e.g., "Create a quiz on World War II").
3. **Backend Communication**: Frontend sends the prompt to the Node.js backend.
4. **LLM Interaction**: Node backend forwards the prompt to a FastAPI service using a local LLM (LM Studio).
5. **Quiz Generation**: LLM returns a JSON quiz based on the prompt.
6. **Quiz Room Creation**: Backend creates a unique room and sets a quiz timer.
7. **Real-time Updates**: WebSocket server broadcasts quiz and timer to participants.
8. **User Participation**: Users join the room and answer questions.
9. **Answer Submission**: Answers are sent to backend in real-time.
10. **Validation & Scoring**: Answers are validated and scores tracked.
11. **Final Leaderboard**: When the quiz ends, backend sends rankings to all players.
12. **Results Display**: Frontend shows the leaderboard and awards.

---

## 🛠️ Local Development

###  Clone the repo

```bash
git clone https://github.com/vankur017/AiQuizApp.git
cd AiQuizApp

```

---

### Install Dependencies 

# Frontend

```
cd frontend
npm install
```
# Backend
```
cd ../backend
npm install
```
# LLM Service
```
cd ../llm-service
pip install -r requirements.txt
```
---

# Frontend (Next.js)
```
cd frontend
npm run dev
```
# Backend (Node.js + Socket.IO)
```
cd ../backend
node server.js
```
# LLM Service (FastAPI)
```
cd ../llm-service
uvicorn main:app --port 8000 --reload
```



