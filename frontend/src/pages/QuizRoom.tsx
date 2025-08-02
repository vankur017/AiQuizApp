import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { socket } from "../utils/socket";
import QuestionCard from "../components/QuestionCard";

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number | null;
}

const QuizRoom: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const [question, setQuestion] = useState<Question | null>(null);
  const [answered, setAnswered] = useState(false);
  const [leaderboard, setLeaderboard] = useState<{ username: string; score: number }[]>([]);
  const [quizEnded, setQuizEnded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    socket.connect();

    const username = "Player-" + Date.now();

    // First joiner for this quizId becomes admin
    if (!sessionStorage.getItem(`admin-${quizId}`)) {
      setIsAdmin(true);
      sessionStorage.setItem(`admin-${quizId}`, "true");
    }

    socket.emit("join_room", { quizId, username });

    socket.on("new_question", (q: Question) => {
      setQuestion(q);
      setAnswered(false);
    });

    socket.on("leaderboard_update", (data) => {
      setLeaderboard(data);
    });

    socket.on("quiz_end", (scores) => {
      setQuizEnded(true);
      alert("Quiz Ended! Final Scores: " + JSON.stringify(scores));
    });

    return () => {
      socket.disconnect();
    };
  }, [quizId]);

  const submitAnswer = (idx: number) => {
    if (question && !answered) {
      socket.emit("submit_answer", { quizId, questionId: question.id, answer: idx });
      setAnswered(true);
    }
  };

  const startQuiz = () => {
    socket.emit("start_quiz", { quizId });
  };

  const nextQuestion = () => {
    if (!quizEnded) {
      socket.emit("next_question", { quizId });
    }
  };

  return (
    <div className="quiz-room">
      <h1>Room ID: {quizId}</h1>

      {question ? (
        <>
          <QuestionCard
            question={question}
            onAnswer={submitAnswer}
            disabled={answered}
          />
          {isAdmin && (
            <button
              onClick={nextQuestion}
              disabled={!answered || quizEnded}
              className="next-btn"
            >
              Next Question
            </button>
          )}
        </>
      ) : quizEnded ? (
        <p>Quiz Finished! See leaderboard below.</p>
      ) : isAdmin ? (
        <button onClick={startQuiz} className="start-btn">
          Start Quiz
        </button>
      ) : (
        <p>Waiting for quiz to start...</p>
      )}

      <div className="leaderboard">
        <h3>Leaderboard</h3>
        <ul>
          {leaderboard.map((p, i) => (
            <li key={i}>
              {p.username}: {p.score}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default QuizRoom;
