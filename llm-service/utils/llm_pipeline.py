import json
import re
from typing import List
from langchain_text_splitters import RecursiveCharacterTextSplitter
import requests

LM_STUDIO_URL = "http://localhost:1234/v1/chat/completions"
MODEL_NAME = "mistral"

def call_llm(prompt: str) -> str:
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": "You are a quiz generator. Always return valid JSON."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 1000
    }
    try:
        res = requests.post(LM_STUDIO_URL, json=payload)
        res.raise_for_status()
        return res.json()["choices"][0]["message"]["content"]
    except Exception as e:
        print("LLM Error:", e)
        return ""

def strip_code_block(text: str) -> str:
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    return match.group(1).strip() if match else text.strip()

def parse_json_response(text: str):
    try:
        cleaned = strip_code_block(text)

        # Extract just the first JSON array from the response
        match = re.search(r"\[\s*{.*}\s*\]", cleaned, re.DOTALL)
        if match:
            return json.loads(match.group(0))

        return json.loads(cleaned)
    except Exception as e:
        print("Parse Error:", e)
        return []


def quiz_from_chunk(text: str) -> List[dict]:
    prompt = f"""
    Generate 5 multiple-choice quiz questions from the following content:

    {text}

    Rules:
    - Return ONLY valid JSON (no explanations, no markdown).
    - The "answer" must exactly match one of the options.
    - Do not include any text outside the JSON.

    Output format:
    [
      {{
        "question": "What is ...?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "answer": "Option A"
      }}
    ]
    """
    raw = call_llm(prompt)
    print("\n=== RAW LLM RESPONSE ===\n", raw)

    parsed = parse_json_response(raw)
    if isinstance(parsed, list) and parsed:
        return parsed

    # ✅ Fallback if parsing fails
    return [{
        "question": "Fallback: What is AWS?",
        "options": ["A cloud provider", "A car company", "A database", "A phone brand"],
        "answer": "A cloud provider"
    }]

def generate_quiz_from_large_text(full_text: str) -> dict:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100
    )
    chunks = splitter.split_text(full_text)

    all_questions = []

    for chunk in chunks:
        questions = quiz_from_chunk(chunk)
        all_questions.extend(questions)

    # ✅ Guarantee non-empty questions
    if not all_questions:
        all_questions = [{
            "question": "Fallback: What does AWS stand for?",
            "options": ["Amazon Web Services", "Advanced Web System", "All World Servers", "Apple Wireless Setup"],
            "answer": "Amazon Web Services"
        }]

    return {
        "topic": "AI-Generated Quiz",
        "questions": all_questions
    }
