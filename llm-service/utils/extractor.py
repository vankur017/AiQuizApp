import re
import requests
from bs4 import BeautifulSoup
from youtube_transcript_api import YouTubeTranscriptApi

def is_youtube(url: str) -> bool:
    return "youtube.com" in url or "youtu.be" in url

def is_coursera(url: str) -> bool:
    return "coursera.org" in url

def is_udemy(url: str) -> bool:
    return "udemy.com" in url

def extract_text_from_url(url: str) -> str:
    if is_youtube(url):
        return extract_from_youtube(url)
    elif is_coursera(url) or is_udemy(url):
        return extract_from_page(url)
    else:
        raise ValueError("Unsupported platform. Only YouTube, Udemy, Coursera supported for now.")

def extract_from_youtube(url: str) -> str:
    match = re.search(r"(v=|youtu\.be/)([a-zA-Z0-9_-]{11})", url)
    if not match:
        raise ValueError("Invalid YouTube URL")
    video_id = match.group(2)

    transcript = YouTubeTranscriptApi.get_transcript(video_id)
    text = " ".join([entry['text'] for entry in transcript])
    return text

def extract_from_page(url: str) -> str:
    response = requests.get(url)
    soup = BeautifulSoup(response.content, "lxml")
    paragraphs = soup.find_all(["p", "li"])
    text = " ".join(p.get_text(strip=True) for p in paragraphs)
    return text[:5000]  # limit to avoid overload
