import json
import re
from typing import List
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.runnables import RunnableSequence
import requests


LM_STUDIO_URL = "http://localhost:1234/v1/chat/completions"
MODEL_NAME = "mistral"

def call_llm(prompt: str) -> str:
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 1000
    }
    try:
        res = requests.post(LM_STUDIO_URL, json=payload)
        return res.json()["choices"][0]["message"]["content"]
    except Exception as e:
        print("LLM Error:", e)
        return ""

def strip_code_block(text: str) -> str:
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    return match.group(1).strip() if match else text.strip()

def parse_json_response(text: str):
    try:
        return json.loads(strip_code_block(text))
    except Exception:
        return []

def summarize_chunk(text: str) -> str:
    prompt = f"Summarize the following course section:\n\n{text}"
    return call_llm(prompt)

def quiz_from_chunk(text: str) -> List[dict]:
    prompt = f"""
Generate 50 multiple-choice quiz questions from the following course section:

{text}

Return the result in JSON format:
[
  {{
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "answer": "..."
  }},
  ...
]
    """.strip()

    raw = call_llm(prompt)
    print("\n=== LLM RAW RESPONSE ===\n", raw)

    return parse_json_response(raw)

def generate_quiz_from_large_text(full_text: str) -> dict:
    # 1. Split long text
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100
    )
    chunks = splitter.split_text(full_text)

    all_questions = []

    # 2. Process each chunk
    for chunk in chunks:
        questions = quiz_from_chunk(chunk)
        all_questions.extend(questions)

    return {
        "topic": "AI-Generated Quiz",
        "questions": all_questions
    }
