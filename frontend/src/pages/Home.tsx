import React, { useState } from "react";
import { useNavigate } from "react-router-dom";


const Home: React.FC = () => {
  const [topic, setTopic] = useState("");
  const [username, setUsername] = useState("");
  const [quizId, setQuizId] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const createQuiz = async () => {
    if (!topic.trim() || !username.trim()) {
      alert("Please enter both a topic and username!");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/admin/create-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputType: "text", data: topic }),
      });
      const data = await res.json();
      if (data.quizId) {
        navigate(`/room/${data.quizId}?username=${encodeURIComponent(username)}`);
      } else {
        alert("Failed to create quiz: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Error creating quiz: " + err);
    } finally {
      setLoading(false);
    }
  };

  const joinQuiz = () => {
    if (!quizId.trim() || !username.trim()) {
      alert("Please enter both a Quiz ID and username!");
      return;
    }
    navigate(`/room/${quizId}?username=${encodeURIComponent(username)}`);
  };

  return (
    <div className="home">
      <div className="homeContainer">
        <h1 className="text-3xl font-bold ">Quiz App</h1>

        {/* Username input */}
        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        {/* Host Quiz */}
        <input
          type="text"
          placeholder="Enter topic or paste course URL"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <button onClick={createQuiz} disabled={loading}>
          {loading ? "Creating..." : "Host Quiz"}
        </button>

        <hr style={{ margin: "20px 0", width: "100%" }} />

        {/* Join Quiz */}
        <input
          type="text"
          placeholder="Enter Quiz ID to join"
          value={quizId}
          onChange={(e) => setQuizId(e.target.value)}
        />
        <button onClick={joinQuiz}>Join Quiz</button>
      </div>
    </div>
  );
};

export default Home;
