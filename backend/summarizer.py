import os
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from llm import ask_groq

PERSIST_DIR = "./chroma_store"

def generate_summary(repo_id: str) -> str:
    persist_path = os.path.join(PERSIST_DIR, repo_id)
    if not os.path.exists(persist_path):
        return "Repository not ingested."

    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    vectorstore = Chroma(persist_directory=persist_path, embedding_function=embeddings)

    queries = [
        "main entry point and application structure",
        "authentication and authorization",
        "database configuration and models",
        "API routes and endpoints",
        "configuration and environment setup"
    ]

    context_parts = []
    for q in queries:
        results = vectorstore.similarity_search(q, k=3)
        for doc in results:
            source = doc.metadata.get("source", "unknown")
            context_parts.append(f"[{source}]: {doc.page_content[:400]}")

    context = "\n\n".join(context_parts[:20])  # Cap context size

    prompt = f"""You are a senior software architect analyzing a repository.
Based on these code samples, provide a comprehensive architecture summary covering:

1. **Project Overview** - What does this project do?
2. **Tech Stack** - Languages, frameworks, libraries
3. **Architecture Pattern** - MVC, microservices, monolith, etc.
4. **Key Components** - Authentication, DB, APIs, services
5. **Entry Points** - Main files to start exploring
6. **Data Flow** - How data moves through the system

CODE SAMPLES:
{context}

Write a clear, structured summary for a developer new to this codebase."""

    return ask_groq(prompt)