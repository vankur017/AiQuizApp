import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import QuizRoom from "./pages/QuizRoom";
import "./App.css"; // Ensure you have this file for global styles

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:quizId" element={<QuizRoom />} />
      </Routes>
    </Router>
  );
};

export default App;
