import os
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from llm import ask_groq

PERSIST_DIR = "./chroma_store"

def query_codebase(question: str, repo_id: str) -> str:
    persist_path = os.path.join(PERSIST_DIR, repo_id)
    if not os.path.exists(persist_path):
        return "Repository not ingested yet. Please ingest the repository first."

    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    vectorstore = Chroma(persist_directory=persist_path, embedding_function=embeddings)

    results = vectorstore.similarity_search(question, k=6)
    context_parts = []
    for doc in results:
        source = doc.metadata.get("source", "unknown")
        context_parts.append(f"### File: {source}\n{doc.page_content}")

    context = "\n\n".join(context_parts)

    prompt = f"""You are an expert code assistant analyzing a software repository.
Using the following code snippets from the repository, answer the developer's question clearly and concisely.

CODE CONTEXT:
{context}

QUESTION: {question}

Provide a helpful, accurate answer. Reference specific files when relevant."""

    return ask_groq(prompt)