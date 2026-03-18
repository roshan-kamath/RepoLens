const API = "http://localhost:8000";
let currentRepoId = null;
let queryCount    = 0;
let repoCount     = 0;
let lastBotMessage = "";

// ── Crosshair cursor ────────────────────────────────────────
const cursorH   = document.getElementById('cursor-h');
const cursorV   = document.getElementById('cursor-v');
const cursorDot = document.getElementById('cursor-dot');

document.addEventListener('mousemove', e => {
  const x = e.clientX;
  const y = e.clientY;

  // Move dot
  cursorDot.style.left = x + 'px';
  cursorDot.style.top  = y + 'px';

  // Move horizontal line to mouse Y
  cursorH.style.transform = `translateY(${y}px)`;

  // Update gradient center for horizontal line (x as % of viewport)
  const xPct = (x / window.innerWidth * 100).toFixed(2) + '%';
  cursorH.style.background = `linear-gradient(90deg,
    transparent 0%,
    transparent calc(${xPct} - 80px),
    rgba(99,255,180,0.06) calc(${xPct} - 80px),
    rgba(99,255,180,0.55) calc(${xPct} - 1px),
    rgba(99,255,180,1) ${xPct},
    rgba(99,255,180,0.55) calc(${xPct} + 1px),
    rgba(99,255,180,0.06) calc(${xPct} + 80px),
    transparent calc(${xPct} + 80px),
    transparent 100%
  )`;

  // Move vertical line to mouse X
  cursorV.style.transform = `translateX(${x}px)`;

  // Update gradient center for vertical line (y as % of viewport height)
  const yPct = (y / window.innerHeight * 100).toFixed(2) + '%';
  cursorV.style.background = `linear-gradient(180deg,
    transparent 0%,
    transparent calc(${yPct} - 80px),
    rgba(99,255,180,0.06) calc(${yPct} - 80px),
    rgba(99,255,180,0.55) calc(${yPct} - 1px),
    rgba(99,255,180,1) ${yPct},
    rgba(99,255,180,0.55) calc(${yPct} + 1px),
    rgba(99,255,180,0.06) calc(${yPct} + 80px),
    transparent calc(${yPct} + 80px),
    transparent 100%
  )`;
});

// Hide crosshair when mouse leaves window
document.addEventListener('mouseleave', () => {
  cursorH.style.opacity   = '0';
  cursorV.style.opacity   = '0';
  cursorDot.style.opacity = '0';
});
document.addEventListener('mouseenter', () => {
  cursorH.style.opacity   = '1';
  cursorV.style.opacity   = '1';
  cursorDot.style.opacity = '1';
});

// ── URL normalization ───────────────────────────────────────
function getFullUrl() {
  let val = document.getElementById("repoUrl").value.trim();
  if (!val) return "";
  if (!val.startsWith("http")) {
    val = val.includes("github.com")
      ? "https://" + val
      : "https://github.com/" + val;
  }
  return val;
}

// ── Ingest ──────────────────────────────────────────────────
async function ingestRepo() {
  const url      = getFullUrl();
  const statusEl = document.getElementById("ingestStatus");
  const btn      = document.getElementById("ingestBtn");
  const progress = document.getElementById("progressWrap");
  const bar      = document.getElementById("progressBar");

  if (!url) { showToast("Please enter a GitHub URL", "error"); return; }

  btn.disabled    = true;
  btn.textContent = "ANALYZING...";
  progress.classList.add("visible");
  bar.className = "progress-bar indeterminate";
  setStatus("loading", "⟳ Cloning repository and building embeddings… (1–3 min)");

  try {
    const res  = await fetch(`${API}/ingest`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ repo_url: url })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail);

    currentRepoId = data.repo_id;
    repoCount++;
    document.getElementById("stat-repos").textContent = repoCount;

    bar.className  = "progress-bar";
    bar.style.width = "100%";
    setTimeout(() => { progress.classList.remove("visible"); bar.style.width = "0%"; }, 800);

    setStatus("success", `✓ "${currentRepoId}" indexed — ready for queries`);

    document.getElementById("repoCardName").textContent = currentRepoId;
    document.getElementById("repoCard").style.display   = "block";
    document.getElementById("actions").style.display    = "flex";
    document.getElementById("suggestions").style.display = "block";
    document.getElementById("chatSection").style.display = "block";

    loadSuggestions();
    showToast("Repository ready!", "success");

  } catch (e) {
    setStatus("error", "✗ " + e.message);
    bar.className = "progress-bar";
    progress.classList.remove("visible");
    showToast("Ingestion failed", "error");
  } finally {
    btn.disabled    = false;
    btn.textContent = "ANALYZE";
  }
}

// ── Suggestion chips ────────────────────────────────────────
const defaultChips = [
  "How does authentication work?",
  "Where is the database configured?",
  "What are the main API endpoints?",
  "Explain the project structure",
  "How is error handling done?",
  "What testing framework is used?"
];

function loadSuggestions() {
  const container = document.getElementById("chipContainer");
  container.innerHTML = "";
  defaultChips.forEach(q => {
    const chip    = document.createElement("button");
    chip.className = "chip";
    chip.textContent = q;
    chip.onclick  = () => {
      document.getElementById("questionInput").value = q;
      askQuestion();
    };
    container.appendChild(chip);
  });
}

// ── Ask question ────────────────────────────────────────────
async function askQuestion() {
  const input    = document.getElementById("questionInput");
  const question = input.value.trim();
  if (!question)        { return; }
  if (!currentRepoId)   { showToast("Analyze a repo first", "error"); return; }

  input.value = "";
  hideEmpty();
  appendMessage("user", question);
  const loadingEl = appendTyping();
  document.getElementById("askBtn").disabled = true;

  try {
    const res  = await fetch(`${API}/query`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ question, repo_id: currentRepoId })
    });
    const data = await res.json();
    const answer = data.answer || data.detail || "No response.";
    lastBotMessage = answer;
    replaceTyping(loadingEl, answer);
    queryCount++;
    document.getElementById("stat-queries").textContent = queryCount;
  } catch (e) {
    replaceTyping(loadingEl, "Error: " + e.message);
  } finally {
    document.getElementById("askBtn").disabled = false;
    input.focus();
  }
}

// ── Special action buttons ──────────────────────────────────
async function getSummary() {
  if (!currentRepoId) return;
  const url = getFullUrl();
  hideEmpty();
  appendMessage("user", "Give me a full architecture summary of this repository.");
  const loadingEl = appendTyping();
  document.getElementById("askBtn").disabled = true;

  try {
    const res  = await fetch(`${API}/summarize`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ repo_url: url })
    });
    const data = await res.json();
    const answer = data.summary || data.detail;
    lastBotMessage = answer;
    replaceTyping(loadingEl, answer);
    queryCount++;
    document.getElementById("stat-queries").textContent = queryCount;
  } catch (e) {
    replaceTyping(loadingEl, "Error: " + e.message);
  } finally {
    document.getElementById("askBtn").disabled = false;
  }
}

async function getDepTree() {
  document.getElementById("questionInput").value =
    "List all major dependencies and explain what each one is used for in this project.";
  await askQuestion();
}

async function getEntryPoints() {
  document.getElementById("questionInput").value =
    "What are the main entry points of this application? Where should a new developer start reading?";
  await askQuestion();
}

// ── Chat helpers ────────────────────────────────────────────
function hideEmpty() {
  const e = document.getElementById("emptyState");
  if (e) e.remove();
}

function appendMessage(role, text) {
  const box = document.getElementById("chatBox");
  const div = document.createElement("div");
  div.className = `msg ${role}`;

  const meta   = document.createElement("div");
  meta.className = "msg-meta";

  const avatar = document.createElement("div");
  avatar.className = "msg-avatar";
  avatar.textContent = role === "user" ? "U" : "AI";

  const label = document.createElement("span");
  label.textContent = role === "user" ? "YOU" : "REPOLENS";

  const time  = document.createElement("span");
  time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (role === "user") {
    meta.appendChild(time);
    meta.appendChild(label);
    meta.appendChild(avatar);
  } else {
    meta.appendChild(avatar);
    meta.appendChild(label);
    meta.appendChild(time);
  }

  const content = document.createElement("div");
  content.className  = "msg-content";
  content.textContent = text;

  div.appendChild(meta);
  div.appendChild(content);
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  return div;
}

function appendTyping() {
  const box = document.getElementById("chatBox");
  const div = document.createElement("div");
  div.className = "msg bot";

  const meta = document.createElement("div");
  meta.className = "msg-meta";
  meta.innerHTML = '<div class="msg-avatar">AI</div><span>REPOLENS</span>';

  const content = document.createElement("div");
  content.className = "msg-content";
  content.innerHTML = `
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>`;

  div.appendChild(meta);
  div.appendChild(content);
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  return div;
}

function replaceTyping(el, text) {
  const content = el.querySelector(".msg-content");
  content.innerHTML   = "";
  content.textContent = text;
  document.getElementById("chatBox").scrollTop = document.getElementById("chatBox").scrollHeight;
}

function clearChat() {
  document.getElementById("chatBox").innerHTML = `
    <div class="empty-state" id="emptyState">
      <div class="empty-icon">⬡</div>
      <div class="empty-text">Chat cleared.<br/>Ask anything about the codebase.</div>
    </div>`;
  showToast("Chat cleared");
}

function copyLastAnswer() {
  if (!lastBotMessage) { showToast("Nothing to copy", "error"); return; }
  navigator.clipboard.writeText(lastBotMessage).then(() => showToast("Copied!", "success"));
}

function handleKey(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    askQuestion();
  }
}

// ── Status & Toast ──────────────────────────────────────────
function setStatus(type, msg) {
  const el  = document.getElementById("ingestStatus");
  el.className   = "status " + type;
  el.textContent = msg;
}

function showToast(msg, type = "") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className   = "show " + (type || "");
  setTimeout(() => { t.className = ""; }, 3000);
}

// ── Paste handler: strip full GitHub URL down to owner/repo ─
document.getElementById("repoUrl").addEventListener("paste", function () {
  setTimeout(() => {
    const match = this.value.trim().match(/(?:https?:\/\/)?(?:www\.)?github\.com\/(.+)/);
    if (match) this.value = match[1];
  }, 10);
});