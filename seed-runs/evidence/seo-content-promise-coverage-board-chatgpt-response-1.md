# SEO Content Promise Coverage Board - ChatGPT response 1

Source URL: https://chatgpt.com/c/6a2e12d0-774c-83ea-848d-b62a8e46f0ee
Provider: ChatGPT
Model selected before prompt: GPT-5.5 Medium
Prompt count: 1

## Prompt exact

Build me a polished self-contained HTML board for checking an SEO article outline: I want to paste a title, meta description, H2s, FAQ, proof points, and CTA, then see simple pass/fix coverage scores with editable sample rows plus copy/export controls.

## Response exact

I’ll make this as a single offline HTML file with local-only logic, editable rows, inert text rendering, pass/fix scoring, and copy/download/export controls built into the page.

Save this as seo-outline-board.html and open it locally.

HTML
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SEO Article Outline Coverage Board</title>
  <style>
    :root{
      --bg:#0f172a;
      --panel:#111c34;
      --panel2:#16223d;
      --card:#f8fafc;
      --ink:#142033;
      --muted:#5f6f86;
      --line:#d9e2ef;
      --soft:#eef4fb;
      --accent:#4f46e5;
      --accent2:#0f766e;
      --warn:#b45309;
      --bad:#be123c;
      --good:#15803d;
      --white:#ffffff;
      --shadow:0 18px 45px rgba(2,8,23,.24);
      --radius:20px;
      --radius2:14px;
      --focus:0 0 0 3px rgba(79,70,229,.22);
      --mono:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;
      --sans:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
    }

    *{
      box-sizing:border-box;
    }

    html{
      min-width:0;
      overflow-x:visible;
    }

    body{
      margin:0;
      font-family:var(--sans);
      background:
        radial-gradient(circle at top left, rgba(79,70,229,.28), transparent 34rem),
        radial-gradient(circle at top right, rgba(20,184,166,.20), transparent 30rem),
        linear-gradient(180deg,#0f172a 0%,#18233e 44%,#e8eef8 44%,#eef4fb 100%);
      color:var(--ink);
      line-height:1.45;
    }

    button,
    input,
    textarea,
    select{
      font:inherit;
    }

    button{
      border:0;
      cursor:pointer;
    }

    .page{
      width:min(1180px,100%);
      margin:0 auto;
      padding:22px;
    }

    .hero{
      color:var(--white);
      padding:22px 0 20px;
      display:grid;
      gap:16px;
    }

    .eyebrow{
      display:inline-flex;
      width:max-content;
      max-width:100%;
      align-items:center;
      gap:8px;
      padding:8px 12px;
      border:1px solid rgba(255,255,255,.18);
      border-radius:999px;
      background:rgba(255,255,255,.08);
      color:#dbeafe;
      font-size:13px;
      font-weight:700;
      letter-spacing:.02em;
    }

    h1{
      margin:0;
      font-size:clamp(34px,6vw,70px);
      line-height:.96;
      max-width:920px;
      letter-spacing:-.03em;
    }

    .hero p{
      margin:0;
      color:#cbd5e1;
      max-width:820px;
      font-size:clamp(15px,2vw,18px);
    }

    .shell{
      display:grid;
      grid-template-columns:minmax(0,1.05fr) minmax(320px,.95fr);
      gap:18px;
      align-items:start;
    }

    .panel{
      background:rgba(248,250,252,.98);
      border:1px solid rgba(226,232,240,.88);
      border-radius:var(--radius);
      box-shadow:var(--shadow);
      overflow:hidden;
      min-width:0;
    }

    .panelHead{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:12px;
      padding:18px 18px 14px;
      background:linear-gradient(180deg,#ffffff,#f3f7fd);
      border-bottom:1px solid var(--line);
    }

    .panelHead h2{
      margin:0;
      font-size:20px;
      line-height:1.1;
    }

    .panelHead p{
      margin:6px 0 0;
      color:var(--muted);
      font-size:13px;
    }

    .scorePill{
      flex:0 0 auto;
      display:grid;
      place-items:center;
      min-width:88px;
      padding:10px 12px;
      border-radius:16px;
      background:#e0e7ff;
      color:#3730a3;
      font-weight:900;
    }

    .scorePill span{
      display:block;
      font-size:24px;
      line-height:1;
    }

    .scorePill small{
      display:block;
      font-size:11px;
      color:#4338ca;
      margin-top:4px;
    }

    .formGrid{
      padding:18px;
      display:grid;
      gap:14px;
    }

    .field{
      display:grid;
      gap:7px;
      min-width:0;
    }

    .field label{
      font-size:13px;
      font-weight:900;
      color:#24324a;
      display:flex;
      justify-content:space-between;
      gap:10px;
      align-items:center;
    }

    .hint{
      color:var(--muted);
      font-weight:700;
      font-size:12px;
    }

    input,
    textarea{
      width:100%;
      max-width:100%;
      border:1px solid #cbd5e1;
      border-radius:14px;
      padding:12px 13px;
      background:#ffffff;
      color:var(--ink);
      outline:none;
      min-width:0;
    }

    textarea{
      min-height:92px;
      resize:vertical;
    }

    input:focus,
    textarea:focus,
    select:focus{
      border-color:var(--accent);
      box-shadow:var(--focus);
    }

    .twoCol{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:14px;
      min-width:0;
    }

    .actions{
      display:flex;
      flex-wrap:wrap;
      gap:10px;
      padding:0 18px 18px;
    }

    .btn{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      gap:8px;
      padding:11px 14px;
      border-radius:14px;
      font-weight:900;
      color:#fff;
      background:var(--accent);
      min-height:44px;
    }

    .btn.secondary{
      background:#0f766e;
    }

    .btn.light{
      background:#e2e8f0;
      color:#1e293b;
    }

    .btn.danger{
      background:#be123c;
    }

    .btn:focus{
      outline:none;
      box-shadow:var(--focus);
    }

    .status{
      margin:0 18px 18px;
      min-height:24px;
      color:#334155;
      font-size:13px;
      font-weight:800;
    }

    .status.good{
      color:var(--good);
    }

    .status.bad{
      color:var(--bad);
    }

    .board{
      padding:18px;
      display:grid;
      gap:12px;
    }

    .summaryCards{
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:10px;
    }

    .miniCard{
      background:var(--soft);
      border:1px solid var(--line);
      border-radius:16px;
      padding:12px;
      min-width:0;
    }

    .miniCard strong{
      display:block;
      font-size:22px;
      line-height:1;
      color:#111827;
    }

    .miniCard span{
      display:block;
      margin-top:5px;
      font-size:12px;
      color:var(--muted);
      font-weight:800;
    }

    .coverageList{
      display:grid;
      gap:10px;
    }

    .checkRow{
      display:grid;
      grid-template-columns:auto 1fr auto;
      gap:10px;
      align-items:start;
      padding:13px;
      border:1px solid var(--line);
      border-radius:16px;
      background:#ffffff;
    }

    .dot{
      width:34px;
      height:34px;
      border-radius:12px;
      display:grid;
      place-items:center;
      font-weight:1000;
      color:#fff;
      flex:0 0 auto;
    }

    .dot.pass{
      background:var(--good);
    }

    .dot.fix{
      background:var(--warn);
    }

    .dot.fail{
      background:var(--bad);
    }

    .rowText{
      min-width:0;
    }

    .rowText strong{
      display:block;
      font-size:14px;
      color:#18243a;
    }

    .rowText span{
      display:block;
      margin-top:3px;
      font-size:12px;
      color:var(--muted);
      overflow-wrap:anywhere;
    }

    .tag{
      align-self:start;
      border-radius:999px;
      padding:6px 9px;
      font-size:11px;
      font-weight:1000;
      letter-spacing:.03em;
      background:#f1f5f9;
      color:#334155;
      white-space:nowrap;
    }

    .tag.pass{
      background:#dcfce7;
      color:#166534;
    }

    .tag.fix{
      background:#fef3c7;
      color:#92400e;
    }

    .tag.fail{
      background:#ffe4e6;
      color:#9f1239;
    }

    .samples{
      padding:18px;
      border-top:1px solid var(--line);
      display:grid;
      gap:12px;
    }

    .samples h3{
      margin:0;
      font-size:17px;
    }

    .sampleTools{
      display:flex;
      gap:10px;
      flex-wrap:wrap;
    }

    .sampleTable{
      display:grid;
      gap:10px;
    }

    .sampleRow{
      display:grid;
      grid-template-columns:130px 1fr 1fr auto;
      gap:9px;
      align-items:start;
      background:#ffffff;
      border:1px solid var(--line);
      border-radius:16px;
      padding:10px;
      min-width:0;
    }

    select{
      width:100%;
      max-width:100%;
      border:1px solid #cbd5e1;
      border-radius:12px;
      padding:10px;
      background:#fff;
      color:var(--ink);
      min-width:0;
    }

    .sampleRow textarea{
      min-height:72px;
      padding:10px;
      border-radius:12px;
    }

    .removeBtn{
      background:#f1f5f9;
      color:#be123c;
      border-radius:12px;
      min-height:40px;
      padding:8px 11px;
      font-weight:1000;
    }

    .brief{
      margin-top:2px;
      padding:14px;
      background:#0b1222;
      color:#dbeafe;
      border-radius:16px;
      border:1px solid rgba(255,255,255,.12);
      font-family:var(--mono);
      font-size:12px;
      white-space:pre-wrap;
      overflow-wrap:anywhere;
      max-height:360px;
      overflow:auto;
    }

    .footerNote{
      color:#64748b;
      font-size:12px;
      padding:0 18px 18px;
    }

    @media (max-width:860px){
      .page{
        padding:14px;
      }

      .shell{
        grid-template-columns:1fr;
      }

      .twoCol{
        grid-template-columns:1fr;
      }

      .summaryCards{
        grid-template-columns:1fr;
      }

      .sampleRow{
        grid-template-columns:1fr;
      }

      .panelHead{
        display:grid;
      }

      .scorePill{
        width:100%;
      }

      .actions,
      .sampleTools{
        display:grid;
        grid-template-columns:1fr;
      }

      .btn{
        width:100%;
      }
    }

    @media print{
      body{
        background:#fff;
      }

      .actions,
      .sampleTools,
      .status,
      .removeBtn{
        display:none;
      }

      .page{
        width:100%;
        padding:0;
      }

      .hero{
        color:#111827;
      }

      .hero p,
      .eyebrow{
        color:#334155;
      }

      .shell{
        grid-template-columns:1fr;
      }

      .panel{
        box-shadow:none;
        break-inside:avoid;
      }
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="hero" aria-labelledby="pageTitle">
      <div class="eyebrow">SEO outline coverage board</div>
      <h1 id="pageTitle">Check the outline before the draft gets expensive.</h1>
      <p>Paste the core SEO article pieces, review pass or fix coverage, edit the sample rows, then copy or export a clean handoff brief.</p>
    </section>

    <section class="shell">
      <article class="panel">
        <div class="panelHead">
          <div>
            <h2>Outline inputs</h2>
            <p>Everything stays in this local browser file. No external libraries, no remote calls.</p>
          </div>
          <div class="scorePill" aria-live="polite">
            <span id="scoreNumber">0</span>
            <small>readiness</small>
          </div>
        </div>

        <div class="formGrid">
          <div class="field">
            <label for="titleInput">Title tag <span class="hint" id="titleCount">0 chars</span></label>
            <input id="titleInput" type="text" placeholder="Example: Retirement Tax Planning Checklist for High Income Households">
          </div>

          <div class="field">
            <label for="metaInput">Meta description <span class="hint" id="metaCount">0 chars</span></label>
            <textarea id="metaInput" placeholder="Paste the draft meta description. Aim for a clear reader promise, proof signal, and reason to click."></textarea>
          </div>

          <div class="twoCol">
            <div class="field">
              <label for="h2Input">H2s <span class="hint">one per line</span></label>
              <textarea id="h2Input" placeholder="What is retirement tax planning?
Roth conversion timing
Capital gains and brackets
RMD planning checklist"></textarea>
            </div>

            <div class="field">
              <label for="faqInput">FAQ <span class="hint">one question per line</span></label>
              <textarea id="faqInput" placeholder="How do Roth conversions affect taxes?
When should I harvest gains?
Can RMDs be reduced?"></textarea>
            </div>
          </div>

          <div class="twoCol">
            <div class="field">
              <label for="proofInput">Proof points <span class="hint">stats, examples, sources</span></label>
              <textarea id="proofInput" placeholder="IRS rule reference, client scenario, bracket example, quoted source, table, calculator logic"></textarea>
            </div>

            <div class="field">
              <label for="ctaInput">CTA <span class="hint">next step</span></label>
              <textarea id="ctaInput" placeholder="Download the checklist, book a review, compare tax planning scenarios, or read the next guide."></textarea>
            </div>
          </div>
        </div>

        <div class="actions" aria-label="controls">
          <button class="btn" id="analyzeBtn" type="button">Analyze outline</button>
          <button class="btn secondary" id="copyBtn" type="button">Copy brief</button>
          <button class="btn light" id="downloadTxtBtn" type="button">Download TXT</button>
          <button class="btn light" id="downloadJsonBtn" type="button">Export JSON</button>
          <button class="btn danger" id="resetBtn" type="button">Reset</button>
        </div>

        <p class="status" id="statusMsg" aria-live="polite"></p>
        <p class="footerNote">Tip: sample rows are editable so you can turn this into a repeatable reviewer checklist for your own article format.</p>
      </article>

      <aside class="panel">
        <div class="panelHead">
          <div>
            <h2>Coverage results</h2>
            <p>Simple scoring for whether the outline can support the search promise.</p>
          </div>
        </div>

        <div class="board">
          <div class="summaryCards">
            <div class="miniCard">
              <strong id="passCount">0</strong>
              <span>pass checks</span>
            </div>
            <div class="miniCard">
              <strong id="fixCount">0</strong>
              <span>fix checks</span>
            </div>
            <div class="miniCard">
              <strong id="failCount">0</strong>
              <span>missing checks</span>
            </div>
          </div>

          <div class="coverageList" id="coverageList"></div>

          <div class="brief" id="briefOutput" tabindex="0"></div>
        </div>

        <div class="samples">
          <h3>Editable sample rows</h3>
          <div class="sampleTools">
            <button class="btn light" id="addRowBtn" type="button">Add row</button>
            <button class="btn light" id="loadSampleBtn" type="button">Load sample</button>
          </div>
          <div class="sampleTable" id="sampleTable"></div>
        </div>
      </aside>
    </section>
  </main>

  <script>
    (function(){
      "use strict";

      var els = {
        title: document.getElementById("titleInput"),
        meta: document.getElementById("metaInput"),
        h2: document.getElementById("h2Input"),
        faq: document.getElementById("faqInput"),
        proof: document.getElementById("proofInput"),
        cta: document.getElementById("ctaInput"),
        analyze: document.getElementById("analyzeBtn"),
        copy: document.getElementById("copyBtn"),
        downloadTxt: document.getElementById("downloadTxtBtn"),
        downloadJson: document.getElementById("downloadJsonBtn"),
        reset: document.getElementById("resetBtn"),
        addRow: document.getElementById("addRowBtn"),
        loadSample: document.getElementById("loadSampleBtn"),
        coverage: document.getElementById("coverageList"),
        sampleTable: document.getElementById("sampleTable"),
        brief: document.getElementById("briefOutput"),
        status: document.getElementById("statusMsg"),
        score: document.getElementById("scoreNumber"),
        pass: document.getElementById("passCount"),
        fix: document.getElementById("fixCount"),
        fail: document.getElementById("failCount"),
        titleCount: document.getElementById("titleCount"),
        metaCount: document.getElementById("metaCount")
      };

      var sampleRows = [
        {
          type:"Search intent",
          item:"Reader wants a practical checklist, not a broad essay.",
          fix:"Make H2s follow task order: diagnose, decide, act, verify."
        },
        {
          type:"Evidence",
          item:"The outline mentions tax savings but has no proof example.",
          fix:"Add one numeric scenario or source-backed rule under each savings claim."
        },
        {
          type:"CTA",
          item:"CTA asks for a consult before the article earns trust.",
          fix:"Use a softer CTA first: download checklist or compare scenarios."
        }
      ];

      function lines(value){
        return String(value || "")
          .split(/\r?\n/)
          .map(function(x){ return x.trim(); })
          .filter(Boolean);
      }

      function words(value){
        return String(value || "")
          .trim()
          .split(/\s+/)
          .filter(Boolean);
      }

      function setStatus(message, kind){
        els.status.className = "status";
        if(kind){ els.status.classList.add(kind); }
        els.status.textContent = message || "";
      }

      function scoreStatus(score){
        if(score >= 2){ return "pass"; }
        if(score === 1){ return "fix"; }
        return "fail";
      }

      function labelFor(status){
        if(status === "pass"){ return "PASS"; }
        if(status === "fix"){ return "FIX"; }
        return "MISSING";
      }

      function symbolFor(status){
        if(status === "pass"){ return "✓"; }
        if(status === "fix"){ return "!"; }
        return "×";
      }

      function buildChecks(){
        var title = els.title.value.trim();
        var meta = els.meta.value.trim();
        var h2s = lines(els.h2.value);
        var faqs = lines(els.faq.value);
        var proofs = lines(els.proof.value);
        var cta = els.cta.value.trim();

        var titleLen = title.length;
        var metaLen = meta.length;
        var proofText = proofs.join(" ").toLowerCase();
        var h2Text = h2s.join(" ").toLowerCase();
        var faqText = faqs.join(" ").toLowerCase();
        var ctaWords = words(cta).length;

        var titleScore = titleLen >= 35 && titleLen <= 65 ? 2 : titleLen >= 20 && titleLen <= 80 ? 1 : 0;
        var metaScore = metaLen >= 120 && metaLen <= 160 ? 2 : metaLen >= 80 && metaLen <= 180 ? 1 : 0;
        var h2Score = h2s.length >= 5 && h2s.length <= 10 ? 2 : h2s.length >= 3 ? 1 : 0;
        var faqScore = faqs.length >= 3 ? 2 : faqs.length >= 1 ? 1 : 0;
        var proofScore = proofs.length >= 4 ? 2 : proofs.length >= 2 ? 1 : 0;
        var ctaScore = ctaWords >= 5 && ctaWords <= 24 ? 2 : ctaWords > 0 ? 1 : 0;

        var intentSignals = 0;
        if(/\b(checklist|guide|how|steps|template|example|best|compare|what|why|when)\b/i.test(title)){ intentSignals += 1; }
        if(h2s.length >= 3){ intentSignals += 1; }
        if(faqs.length >= 2){ intentSignals += 1; }
        var intentScore = intentSignals >= 3 ? 2 : intentSignals >= 1 ? 1 : 0;

        var proofCoverageSignals = 0;
        if(/\b(source|study|data|example|case|irs|percent|%|calculator|table|quote|research|survey)\b/.test(proofText)){ proofCoverageSignals += 1; }
        if(proofs.length >= Math.max(2, Math.ceil(h2s.length / 2))){ proofCoverageSignals += 1; }
        var supportScore = proofCoverageSignals >= 2 ? 2 : proofCoverageSignals >= 1 ? 1 : 0;

        var faqOverlap = 0;
        faqs.forEach(function(q){
          var chunks = q.toLowerCase().split(/\W+/).filter(function(token){
            return token.length > 4;
          });
          if(chunks.some(function(token){ return h2Text.indexOf(token) !== -1 || proofText.indexOf(token) !== -1; })){
            faqOverlap += 1;
          }
        });
        var faqSupportScore = faqs.length >= 3 && faqOverlap >= 2 ? 2 : faqs.length > 0 && faqOverlap > 0 ? 1 : 0;

        var snippetScore = 0;
        if(titleScore >= 1){ snippetScore += 1; }
        if(metaScore >= 1){ snippetScore += 1; }
        if(/\b(learn|get|use|compare|download|see|find|check)\b/i.test(meta)){ snippetScore += 1; }
        snippetScore = snippetScore >= 3 ? 2 : snippetScore >= 1 ? 1 : 0;

        var ctaAlignScore = 0;
        var ctaLower = cta.toLowerCase();
        if(ctaWords > 0){ ctaAlignScore += 1; }
        if(/\b(checklist|guide|template|download|compare|review|plan|audit|next)\b/.test(ctaLower)){ ctaAlignScore += 1; }
        ctaAlignScore = ctaAlignScore >= 2 ? 2 : ctaAlignScore >= 1 ? 1 : 0;

        return [
          {
            name:"Title length and promise",
            score:titleScore,
            detail:titleLen ? titleLen + " characters. Best range is usually 35 to 65." : "No title pasted yet.",
            fix:"Make the title specific, searchable, and not bloated."
          },
          {
            name:"Meta description readiness",
            score:metaScore,
            detail:metaLen ? metaLen + " characters. Strong range is roughly 120 to 160." : "No meta description pasted yet.",
            fix:"Add reader outcome, proof signal, and click reason."
          },
          {
            name:"Search intent coverage",
            score:intentScore,
            detail:intentSignals + " intent signals found across title, H2s, and FAQ.",
            fix:"Mirror the likely search task in the H2 flow."
          },
          {
            name:"H2 structure",
            score:h2Score,
            detail:h2s.length + " H2 rows detected.",
            fix:"Use 5 to 10 H2s that move from context to action."
          },
          {
            name:"FAQ coverage",
            score:faqScore,
            detail:faqs.length + " FAQ rows detected.",
            fix:"Add 3 to 5 real questions the reader would ask before converting."
          },
          {
            name:"Proof point volume",
            score:proofScore,
            detail:proofs.length + " proof points detected.",
            fix:"Add source references, examples, numbers, tables, or quotes."
          },
          {
            name:"Proof supports FAQ",
            score:faqSupportScore,
            detail:faqOverlap + " FAQ rows overlap with H2s or proof language.",
            fix:"Tie FAQ answers back to evidence or article sections."
          },
          {
            name:"Evidence quality signal",
            score:supportScore,
            detail:proofCoverageSignals + " source or example signals found.",
            fix:"Replace vague claims with named sources, examples, or calculations."
          },
          {
            name:"CTA clarity",
            score:ctaScore,
            detail:ctaWords + " CTA words detected.",
            fix:"Use one clear next step. Avoid asking for too much too early."
          },
          {
            name:"CTA alignment",
            score:ctaAlignScore,
            detail:ctaWords ? "CTA has a next-step pattern." : "No CTA pasted yet.",
            fix:"Match the CTA to the article promise."
          },
          {
            name:"SERP snippet readiness",
            score:snippetScore,
            detail:"Combines title, meta, and action wording.",
            fix:"Make the title and meta work together instead of repeating each other."
          }
        ];
      }

      function renderChecks(checks){
        els.coverage.textContent = "";

        var pass = 0;
        var fix = 0;
        var fail = 0;
        var total = 0;

        checks.forEach(function(check){
          total += check.score;
          var status = scoreStatus(check.score);
          if(status === "pass"){ pass += 1; }
          if(status === "fix"){ fix += 1; }
          if(status === "fail"){ fail += 1; }

          var row = document.createElement("div");
          row.className = "checkRow";

          var dot = document.createElement("div");
          dot.className = "dot " + status;
          dot.textContent = symbolFor(status);

          var text = document.createElement("div");
          text.className = "rowText";

          var strong = document.createElement("strong");
          strong.textContent = check.name;

          var detail = document.createElement("span");
          detail.textContent = check.detail + " Fix: " + check.fix;

          var tag = document.createElement("div");
          tag.className = "tag " + status;
          tag.textContent = labelFor(status);

          text.appendChild(strong);
          text.appendChild(detail);
          row.appendChild(dot);
          row.appendChild(text);
          row.appendChild(tag);
          els.coverage.appendChild(row);
        });

        var readiness = Math.round((total / (checks.length * 2)) * 100);
        els.score.textContent = String(readiness);
        els.pass.textContent = String(pass);
        els.fix.textContent = String(fix);
        els.fail.textContent = String(fail);

        return {
          readiness:readiness,
          pass:pass,
          fix:fix,
          fail:fail
        };
      }

      function buildBrief(checks, summary){
        var title = els.title.value.trim();
        var meta = els.meta.value.trim();
        var h2s = lines(els.h2.value);
        var faqs = lines(els.faq.value);
        var proofs = lines(els.proof.value);
        var cta = els.cta.value.trim();

        var fixes = checks.filter(function(check){
          return check.score < 2;
        });

        var sampleText = sampleRows.map(function(row, index){
          return String(index + 1) + ". [" + row.type + "] " + row.item + " | Fix: " + row.fix;
        }).join("\n");

        var checkText = checks.map(function(check){
          return "- " + labelFor(scoreStatus(check.score)) + ": " + check.name + " | " + check.detail + " | Fix: " + check.fix;
        }).join("\n");

        var fixText = fixes.length ? fixes.map(function(check){
          return "- " + check.name + ": " + check.fix;
        }).join("\n") : "- No major fixes flagged.";

        return [
          "SEO ARTICLE OUTLINE COVERAGE BRIEF",
          "",
          "Readiness score: " + summary.readiness + "/100",
          "Pass: " + summary.pass + " | Fix: " + summary.fix + " | Missing: " + summary.fail,
          "",
          "TITLE",
          title || "[missing]",
          "",
          "META DESCRIPTION",
          meta || "[missing]",
          "",
          "H2S",
          h2s.length ? h2s.map(function(x){ return "- " + x; }).join("\n") : "[missing]",
          "",
          "FAQ",
          faqs.length ? faqs.map(function(x){ return "- " + x; }).join("\n") : "[missing]",
          "",
          "PROOF POINTS",
          proofs.length ? proofs.map(function(x){ return "- " + x; }).join("\n") : "[missing]",
          "",
          "CTA",
          cta || "[missing]",
          "",
          "COVERAGE CHECKS",
          checkText,
          "",
          "PRIORITY FIXES",
          fixText,
          "",
          "EDITABLE REVIEW ROWS",
          sampleText || "[none]"
        ].join("\n");
      }

      function analyze(){
        els.titleCount.textContent = String(els.title.value.length) + " chars";
        els.metaCount.textContent = String(els.meta.value.length) + " chars";
        var checks = buildChecks();
        var summary = renderChecks(checks);
        var brief = buildBrief(checks, summary);
        els.brief.textContent = brief;
        saveState();
        return {
          checks:checks,
          summary:summary,
          brief:brief
        };
      }

      function renderSamples(){
        els.sampleTable.textContent = "";

        sampleRows.forEach(function(row, index){
          var wrap = document.createElement("div");
          wrap.className = "sampleRow";

          var select = document.createElement("select");
          ["Search intent","Title and meta","H2 coverage","FAQ","Evidence","CTA","Internal links","Risk"].forEach(function(optionText){
            var option = document.createElement("option");
            option.value = optionText;
            option.textContent = optionText;
            if(optionText === row.type){ option.selected = true; }
            select.appendChild(option);
          });

          var item = document.createElement("textarea");
          item.value = row.item;
          item.setAttribute("aria-label","Sample issue");

          var fix = document.createElement("textarea");
          fix.value = row.fix;
          fix.setAttribute("aria-label","Sample fix");

          var remove = document.createElement("button");
          remove.type = "button";
          remove.className = "removeBtn";
          remove.textContent = "Remove";

          select.addEventListener("change", function(){
            sampleRows[index].type = select.value;
            analyze();
          });

          item.addEventListener("input", function(){
            sampleRows[index].item = item.value;
            analyze();
          });

          fix.addEventListener("input", function(){
            sampleRows[index].fix = fix.value;
            analyze();
          });

          remove.addEventListener("click", function(){
            sampleRows.splice(index, 1);
            renderSamples();
            analyze();
          });

          wrap.appendChild(select);
          wrap.appendChild(item);
          wrap.appendChild(fix);
          wrap.appendChild(remove);
          els.sampleTable.appendChild(wrap);
        });
      }

      function fallbackCopy(text){
        var area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.left = "-9999px";
        area.style.top = "0";
        document.body.appendChild(area);
        area.focus();
        area.select();

        var ok = false;
        try{
          ok = document.execCommand("copy");
        }catch(e){
          ok = false;
        }

        document.body.removeChild(area);
        return ok;
      }

      function copyText(text){
        if(navigator.clipboard && window.isSecureContext){
          return navigator.clipboard.writeText(text).then(function(){
            return true;
          }).catch(function(){
            return fallbackCopy(text);
          });
        }
        return Promise.resolve(fallbackCopy(text));
      }

      function downloadFile(filename, content, type){
        var blob = new Blob([content], {type:type});
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function(){
          URL.revokeObjectURL(url);
        }, 250);
      }

      function exportObject(){
        var current = analyze();
        return {
          generatedAt:new Date().toISOString(),
          title:els.title.value,
          metaDescription:els.meta.value,
          h2s:lines(els.h2.value),
          faq:lines(els.faq.value),
          proofPoints:lines(els.proof.value),
          cta:els.cta.value,
          sampleRows:sampleRows,
          summary:current.summary,
          checks:current.checks
        };
      }

      function saveState(){
        var data = {
          title:els.title.value,
          meta:els.meta.value,
          h2:els.h2.value,
          faq:els.faq.value,
          proof:els.proof.value,
          cta:els.cta.value,
          sampleRows:sampleRows
        };
        try{
          localStorage.setItem("seoOutlineCoverageBoard", JSON.stringify(data));
        }catch(e){}
      }

      function loadState(){
        var raw = "";
        try{
          raw = localStorage.getItem("seoOutlineCoverageBoard") || "";
        }catch(e){
          raw = "";
        }

        if(!raw){ return false; }

        try{
          var data = JSON.parse(raw);
          els.title.value = data.title || "";
          els.meta.value = data.meta || "";
          els.h2.value = data.h2 || "";
          els.faq.value = data.faq || "";
          els.proof.value = data.proof || "";
          els.cta.value = data.cta || "";
          if(Array.isArray(data.sampleRows)){
            sampleRows = data.sampleRows;
          }
          return true;
        }catch(e){
          return false;
        }
      }

      function loadSample(){
        els.title.value = "Retirement Tax Planning Checklist for High Income Households";
        els.meta.value = "Use this retirement tax planning checklist to spot Roth conversion, capital gains, RMD, and charitable giving opportunities before year end.";
        els.h2.value = [
          "What retirement tax planning should solve",
          "Review ordinary income and capital gains brackets",
          "Test Roth conversion windows",
          "Coordinate RMDs and charitable giving",
          "Check Medicare and IRMAA impact",
          "Build a year end action checklist"
        ].join("\n");
        els.faq.value = [
          "When should Roth conversions be considered?",
          "How do capital gains affect retirement taxes?",
          "Can charitable giving reduce RMD taxation?",
          "What tax planning should happen before year end?"
        ].join("\n");
        els.proof.value = [
          "IRS RMD age rule reference",
          "Example comparing partial Roth conversion versus no conversion",
          "Capital gains bracket table",
          "Qualified charitable distribution rule summary",
          "Medicare IRMAA threshold reminder"
        ].join("\n");
        els.cta.value = "Download the year end retirement tax planning checklist.";
        sampleRows = [
          {
            type:"Search intent",
            item:"The outline promises a checklist and uses a practical sequence.",
            fix:"Keep each H2 action oriented."
          },
          {
            type:"Evidence",
            item:"Roth conversion and RMD sections need actual numbers.",
            fix:"Add one sample scenario and one IRS reference."
          },
          {
            type:"CTA",
            item:"CTA matches the checklist promise.",
            fix:"Place it after the final checklist section."
          }
        ];
        renderSamples();
        analyze();
        setStatus("Sample loaded.", "good");
      }

      [els.title, els.meta, els.h2, els.faq, els.proof, els.cta].forEach(function(input){
        input.addEventListener("input", function(){
          analyze();
          setStatus("Saved locally in this browser.", "good");
        });
      });

      els.analyze.addEventListener("click", function(){
        analyze();
        setStatus("Outline analyzed.", "good");
      });

      els.copy.addEventListener("click", function(){
        var current = analyze();
        copyText(current.brief).then(function(ok){
          if(ok){
            setStatus("Brief copied to clipboard.", "good");
          }else{
            setStatus("Copy failed. Select the brief text and copy manually.", "bad");
          }
        });
      });

      els.downloadTxt.addEventListener("click", function(){
        var current = analyze();
        downloadFile("seo-outline-coverage-brief.txt", current.brief, "text/plain;charset=utf-8");
        setStatus("TXT downloaded.", "good");
      });

      els.downloadJson.addEventListener("click", function(){
        var data = JSON.stringify(exportObject(), null, 2);
        downloadFile("seo-outline-coverage-export.json", data, "application/json;charset=utf-8");
        setStatus("JSON exported.", "good");
      });

      els.reset.addEventListener("click", function(){
        els.title.value = "";
        els.meta.value = "";
        els.h2.value = "";
        els.faq.value = "";
        els.proof.value = "";
        els.cta.value = "";
        sampleRows = [];
        renderSamples();
        analyze();
        try{
          localStorage.removeItem("seoOutlineCoverageBoard");
        }catch(e){}
        setStatus("Board reset.", "good");
      });

      els.addRow.addEventListener("click", function(){
        sampleRows.push({
          type:"Evidence",
          item:"Add reviewer note here.",
          fix:"Add the concrete fix here."
        });
        renderSamples();
        analyze();
        setStatus("Editable row added.", "good");
      });

      els.loadSample.addEventListener("click", function(){
        loadSample();
      });

      var restored = loadState();
      renderSamples();
      analyze();
      if(restored){
        setStatus("Restored from local browser storage.", "good");
      }else{
        setStatus("Ready. Paste an outline or load the sample.", "");
      }
    })();
  </script>
</body>
</html>

