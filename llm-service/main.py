from fastapi import FastAPI, Request
from utils.extractor import extract_text_from_url
from utils.llm_pipeline import generate_quiz_from_large_text

app = FastAPI()

@app.post("/generate-quiz")
async def generate_quiz(request: Request):
    body = await request.json()
    input_type = body.get("inputType")
    data = body.get("data")

    try:
        if input_type == "url":
            extracted_text = extract_text_from_url(data)
        else:
            extracted_text = data

        result = generate_quiz_from_large_text(extracted_text)
        return {"quiz": result}
    except Exception as e:
        return {"error": str(e)}
