def build_quiz_prompt(text: str, topic: str = "") -> str:
    topic_line = f"Topic: {topic}\n" if topic else ""
    return f"""
{topic_line}
Based on the following content, generate a 10-question multiple-choice quiz in JSON format.

Instructions:
- Include a "topic" field
- Include 10 "questions"
- Each question should have "question", "options", and "answer"

Content:
{text}

Return ONLY JSON.
"""
