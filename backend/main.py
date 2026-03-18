from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ingest import ingest_repository
from retriever import query_codebase
from summarizer import generate_summary
import os

app = FastAPI(title="Repo Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class RepoRequest(BaseModel):
    repo_url: str

class QueryRequest(BaseModel):
    question: str
    repo_id: str

@app.post("/ingest")
async def ingest(req: RepoRequest):
    try:
        repo_id = ingest_repository(req.repo_url)
        return {"status": "success", "repo_id": repo_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query")
async def query(req: QueryRequest):
    try:
        answer = query_codebase(req.question, req.repo_id)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/summarize")
async def summarize(req: RepoRequest):
    try:
        # Extract repo_id from URL
        repo_id = req.repo_url.rstrip("/").split("/")[-1]
        summary = generate_summary(repo_id)
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))