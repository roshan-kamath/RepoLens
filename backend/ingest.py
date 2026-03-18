import os
import git
import chardet
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from dotenv import load_dotenv

load_dotenv()

SUPPORTED_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".cpp", ".c",
    ".cs", ".go", ".rb", ".php", ".html", ".css", ".md", ".txt",
    ".json", ".yaml", ".yml", ".sh", ".env.example"
}

PERSIST_DIR = "./chroma_store"

def clone_repo(repo_url: str) -> str:
    repo_name = repo_url.rstrip("/").split("/")[-1].replace(".git", "")
    clone_path = f"C:/tmp/{repo_name}"   # Windows-safe path
    if os.path.exists(clone_path):
        return clone_path
    os.makedirs("C:/tmp", exist_ok=True)
    git.Repo.clone_from(repo_url, clone_path, depth=1)
    return clone_path

def load_files(repo_path: str) -> list:
    documents = []
    for root, dirs, files in os.walk(repo_path):
        # Skip hidden and vendor directories
        dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ("node_modules", "__pycache__", "venv", ".git")]
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext not in SUPPORTED_EXTENSIONS:
                continue
            filepath = os.path.join(root, file)
            try:
                with open(filepath, "rb") as f:
                    raw = f.read()
                encoding = chardet.detect(raw).get("encoding") or "utf-8"
                content = raw.decode(encoding, errors="replace")
                rel_path = os.path.relpath(filepath, repo_path)
                documents.append({"content": content, "source": rel_path})
            except Exception:
                continue
    return documents

def ingest_repository(repo_url: str) -> str:
    repo_name = repo_url.rstrip("/").split("/")[-1].replace(".git", "")
    print(f"Cloning {repo_url}...")
    repo_path = clone_repo(repo_url)

    print("Loading files...")
    docs = load_files(repo_path)

    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
    chunks = []
    metadatas = []
    for doc in docs:
        splits = splitter.split_text(doc["content"])
        chunks.extend(splits)
        metadatas.extend([{"source": doc["source"]}] * len(splits))

    print(f"Embedding {len(chunks)} chunks...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    persist_path = os.path.join(PERSIST_DIR, repo_name)
    vectorstore = Chroma.from_texts(
        texts=chunks,
        embedding=embeddings,
        metadatas=metadatas,
        persist_directory=persist_path
    )
    vectorstore.persist()
    print(f"Ingestion complete for: {repo_name}")
    return repo_name