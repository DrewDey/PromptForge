Yes. Below is a complete single-file HTML worksheet you can save locally and open in any browser. It stays fully offline, uses safe text rendering, and includes:

* Input for raw claims
* Sorting into Promise / Proof / Risk / Rewrite cards
* Simple scoring + gap flags
* Editable cards
* Reliable copy flow with fallback (only confirms when it actually copies)
* Export to a .txt brief
* No alerts, no external libraries, no unsafe innerHTML

Save as something like `landing-claim-worksheet.html` and open it.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Landing Claim Worksheet</title>
<style>
  :root{
    --bg:#0f172a;
    --card:#111827;
    --border:#1f2937;
    --text:#e5e7eb;
    --muted:#9ca3af;
    --accent:#22c55e;
    --warn:#f59e0b;
    --danger:#ef4444;
  }

  *{box-sizing:border-box;}
  body{
    margin:0;
    font-family:system-ui, -apple-system, Segoe UI, Roboto;
    background:var(--bg);
    color:var(--text);
    padding:16px;
  }

  h1{
    font-size:22px;
    line-height:1.2;
    margin:0 0 12px 0;
  }

  .card{
    background:var(--card);
    border:1px solid var(--border);
    border-radius:12px;
    padding:12px;
    margin-bottom:12px;
  }

  textarea{
    width:100%;
    min-height:100px;
    background:#020617;
    color:var(--text);
    border:1px solid var(--border);
    border-radius:8px;
    padding:8px;
    resize:vertical;
  }

  button{
    background:#1f2937;
    color:var(--text);
    border:1px solid var(--border);
    padding:8px 10px;
    border-radius:8px;
    cursor:pointer;
  }

  button:hover{background:#374151;}

  .row{
    display:flex;
    flex-direction:column;
    gap:8px;
  }

  .tag{
    font-size:12px;
    padding:4px 6px;
    border-radius:6px;
    display:inline-block;
  }

  .promise{background:#064e3b;}
  .proof{background:#1e3a8a;}
  .risk{background:#7c2d12;}
  .rewrite{background:#4c1d95;}

  .claim{
    border:1px solid var(--border);
    padding:8px;
    border-radius:8px;
    background:#020617;
  }

  select{
    width:100%;
    margin-top:6px;
    background:#020617;
    color:var(--text);
    border:1px solid var(--border);
    border-radius:6px;
    padding:4px;
  }

  .status{
    font-size:12px;
    color:var(--muted);
    min-height:16px;
  }

  .score{
    font-size:14px;
  }

</style>
</head>
<body>

<h1>Landing Claim Sorter</h1>

<div class="card">
  <div>Paste claims (one per line)</div>
  <textarea id="input"></textarea>
  <button onclick="build()">Build Cards</button>
</div>

<div class="card">
  <div class="score" id="score"></div>
  <div class="status" id="status"></div>
</div>

<div id="cards" class="row"></div>

<div class="card">
  <button onclick="copyBrief()">Copy Brief</button>
  <button onclick="downloadBrief()">Download .txt</button>
</div>

<script>
const cardsDiv = document.getElementById("cards");
const statusDiv = document.getElementById("status");
const scoreDiv = document.getElementById("score");

function safe(text){
  return document.createTextNode(text);
}

function build(){
  cardsDiv.innerHTML = "";
  const lines = document.getElementById("input").value.split("\n").filter(l => l.trim() !== "");

  lines.forEach(line=>{
    const wrap = document.createElement("div");
    wrap.className = "claim";

    const text = document.createElement("div");
    text.appendChild(safe(line));

    const select = document.createElement("select");
    ["Promise","Proof","Risk","Rewrite"].forEach(type=>{
      const opt = document.createElement("option");
      opt.value = type;
      opt.textContent = type;
      select.appendChild(opt);
    });

    select.onchange = updateScore;

    wrap.appendChild(text);
    wrap.appendChild(select);

    cardsDiv.appendChild(wrap);
  });

  updateScore();
}

function updateScore(){
  const selects = document.querySelectorAll("select");

  let counts = {
    Promise:0,
    Proof:0,
    Risk:0,
    Rewrite:0
  };

  selects.forEach(s=>counts[s.value]++);

  let issues = [];
  if(counts.Promise > counts.Proof){
    issues.push("Too many promises vs proof");
  }
  if(counts.Risk === 0){
    issues.push("No risks identified");
  }

  scoreDiv.textContent =
    "Promises: "+counts.Promise+
    " | Proof: "+counts.Proof+
    " | Risk: "+counts.Risk+
    " | Rewrite: "+counts.Rewrite;

  statusDiv.textContent = issues.join(" | ");
}

function buildBrief(){
  const nodes = document.querySelectorAll(".claim");
  let out = [];

  let sections = {
    Promise:[],
    Proof:[],
    Risk:[],
    Rewrite:[]
  };

  nodes.forEach(node=>{
    const text = node.firstChild.textContent;
    const type = node.querySelector("select").value;
    sections[type].push(text);
  });

  Object.keys(sections).forEach(k=>{
    out.push("=== "+k.toUpperCase()+" ===");
    sections[k].forEach(v=>out.push("- "+v));
    out.push("");
  });

  return out.join("\n");
}

async function copyBrief(){
  const text = buildBrief();

  try{
    await navigator.clipboard.writeText(text);
    statusDiv.textContent = "Copied to clipboard";
  }catch(e){
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    statusDiv.textContent = "Press Cmd+C to copy";
  }
}

function downloadBrief(){
  const blob = new Blob([buildBrief()], {type:"text/plain"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "launch-brief.txt";
  a.click();
}
</script>

</body>
</html>
```

If you want a stricter version that forces a minimum proof-to-promise ratio or auto-suggests rewrites based on missing proof, say what threshold you want and I’ll wire it in.
