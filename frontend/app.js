const API = "http://localhost:8000";
let currentRepoId = null;

async function ingestRepo() {
  const url = document.getElementById("repoUrl").value.trim();
  const status = document.getElementById("ingestStatus");
  const btn = document.getElementById("ingestBtn");

  if (!url) return;

  btn.disabled = true;
  status.className = "status";
  status.textContent = "⠋ Cloning and analyzing repository… (this may take 1–3 min)";

  try {
    const res = await fetch(`${API}/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo_url: url })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail);

    currentRepoId = data.repo_id;
    status.textContent = `✓ Repository "${currentRepoId}" ready. Start asking questions!`;
    document.getElementById("actions").style.display = "flex";
    document.getElementById("chatSection").style.display = "block";
  } catch (e) {
    status.className = "status error";
    status.textContent = "✗ Error: " + e.message;
  } finally {
    btn.disabled = false;
  }
}

async function askQuestion() {
  const input = document.getElementById("questionInput");
  const question = input.value.trim();
  if (!question || !currentRepoId) return;

  input.value = "";
  appendMessage("user", question);
  const loadingEl = appendMessage("bot", "", true);

  try {
    const res = await fetch(`${API}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, repo_id: currentRepoId })
    });
    const data = await res.json();
    loadingEl.querySelector(".msg-content").textContent = data.answer || data.detail;
    loadingEl.querySelector(".msg-content").classList.remove("loading-dot");
  } catch (e) {
    loadingEl.querySelector(".msg-content").textContent = "Error: " + e.message;
  }
}

async function getSummary() {
  const repoUrl = document.getElementById("repoUrl").value.trim();
  appendMessage("user", "Give me an architecture summary of this repository.");
  const loadingEl = appendMessage("bot", "", true);

  try {
    const res = await fetch(`${API}/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo_url: repoUrl })
    });
    const data = await res.json();
    loadingEl.querySelector(".msg-content").textContent = data.summary || data.detail;
    loadingEl.querySelector(".msg-content").classList.remove("loading-dot");
  } catch (e) {
    loadingEl.querySelector(".msg-content").textContent = "Error: " + e.message;
  }
}

function appendMessage(role, text, loading = false) {
  const box = document.getElementById("chatBox");
  const div = document.createElement("div");
  div.className = `msg ${role}`;

  const label = document.createElement("div");
  label.className = "msg-label";
  label.textContent = role === "user" ? "you" : "repomind";

  const content = document.createElement("div");
  content.className = "msg-content" + (loading ? " loading-dot" : "");
  content.textContent = text;

  div.appendChild(label);
  div.appendChild(content);
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  return div;
}