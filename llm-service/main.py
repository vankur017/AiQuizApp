from fastapi import FastAPI, Request
from utils.extractor import extract_text_from_url
from utils.prompt_template import build_quiz_prompt
import requests
import re

app = FastAPI()

# Function to strip markdown-style ```json blocks
def strip_code_block(text: str):
    return re.sub(r"^```(json)?\n?|\n?```$", "", text.strip(), flags=re.MULTILINE)

@app.post("/generate-quiz")
async def generate_quiz(request: Request):
    body = await request.json()
    input_type = body.get("inputType")
    data = body.get("data")

    try:
        if input_type == "url":
            extracted_text = extract_text_from_url(data)
        else:
            extracted_text = data  # Plain prompt

        prompt = build_quiz_prompt(extracted_text)
        payload = {
            "model": "mistral",  # Use your LM Studio model name
            "messages": [
                {"role": "system", "content": "You are a quiz generator."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 1000
        }

        response = requests.post("http://localhost:1234/v1/chat/completions", json=payload)
        content = response.json()["choices"][0]["message"]["content"]

        # Clean markdown code block
        clean_content = strip_code_block(content)
        print(clean_content)

        return {"quiz": clean_content}

    except Exception as e:
        return {"error": str(e)}
