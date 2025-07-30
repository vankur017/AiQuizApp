import React from "react";

interface Props {
  question: {
    id: string;
    text: string;
    options: string[];
  };
  onAnswer: (index: number) => void;
  disabled: boolean;
}

const QuestionCard: React.FC<Props> = ({ question, onAnswer, disabled }) => {
  return (
    <div className="question-card">
      <h2>{question.text}</h2>
      <div className="options">
        {question.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => onAnswer(i)}
            disabled={disabled}
            className="option-btn"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuestionCard;
