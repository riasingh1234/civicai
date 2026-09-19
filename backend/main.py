from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def home():
    return {"message": "CivicAI backend is running"}