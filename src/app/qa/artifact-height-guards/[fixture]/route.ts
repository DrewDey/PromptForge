import type { NextRequest } from 'next/server'

const fixtureDocuments = {
  tall: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Tall pending-state control</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; }
    body { min-height: 1500px; background: #111827; color: #f8fafc; font: 700 16px/1.5 system-ui, sans-serif; }
    main { padding: 32px; }
  </style>
</head>
<body>
  <main><h1>Tall pending-state control</h1></main>
</body>
</html>`,
  delayed: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Delayed shorter artifact</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; }
    body { min-height: 780px; background: #111827; color: #f8fafc; font: 700 16px/1.5 system-ui, sans-serif; }
    main { padding: 32px; }
  </style>
</head>
<body>
  <main>
    <h1>Delayed shorter artifact</h1>
    <p id="late-growth-status">Waiting for a post-paint height change.</p>
  </main>
  <script>
    window.addEventListener('pathforge-artifact-size-reported', () => {
      window.setTimeout(() => {
        document.body.style.minHeight = '900px'
        document.getElementById('late-growth-status').textContent = 'Post-paint height change complete.'
      }, 250)
    }, { once: true })
  </script>
</body>
</html>`,
  remount: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Remounted late-growth artifact</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; }
    body { min-height: 780px; background: #111827; color: #f8fafc; font: 700 16px/1.5 system-ui, sans-serif; }
    main { padding: 32px; }
  </style>
</head>
<body>
  <main>
    <h1>Remounted late-growth artifact</h1>
    <p id="remount-growth-status">Waiting for the document-generation growth check.</p>
  </main>
  <script>
    const mountKey = 'pathforge-qa-remount-count'
    const mountCount = Number(sessionStorage.getItem(mountKey) || '0') + 1
    sessionStorage.setItem(mountKey, String(mountCount))
    const targetHeight = 700 + mountCount * 200
    const grow = () => {
      document.body.style.minHeight = targetHeight + 'px'
      document.getElementById('remount-growth-status').textContent =
        'Document generation ' + mountCount + ' growth complete.'
    }
    window.addEventListener('pathforge-artifact-size-reported', () => {
      window.setTimeout(grow, 250)
    }, { once: true })
  </script>
</body>
</html>`,
  slow: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Slow intermediate artifact</title>
  <style>
    html, body { margin: 0; min-height: 720px; background: #111827; color: #f8fafc; font: 700 16px/1.5 system-ui, sans-serif; }
    main { padding: 32px; }
  </style>
</head>
<body>
  <main><h1>Slow intermediate artifact</h1></main>
</body>
</html>`,
  feedback: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Viewport feedback-loop fixture</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; min-width: 100%; }
    body {
      box-sizing: content-box;
      min-height: 100vh;
      padding: 0 0 120px;
      background: #111827;
      color: #f8fafc;
      font: 700 16px/1.5 system-ui, sans-serif;
    }
    main { padding: 32px; }
  </style>
</head>
<body>
  <main>
    <h1>Self-growing 100vh fixture</h1>
    <p>This deliberately adds content-box padding below a viewport-height body.</p>
  </main>
</body>
</html>`,
  limits: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Raw measurement-limit fixture</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; }
    body {
      width: 15050px;
      min-height: 7050px;
      background: #111827;
      color: #f8fafc;
      font: 700 16px/1.5 system-ui, sans-serif;
    }
    main { padding: 32px; }
  </style>
</head>
<body>
  <main>
    <h1>Oversized measurement fixture</h1>
    <p>This deliberately exceeds both protected auto-fit measurement limits.</p>
  </main>
</body>
</html>`,
} as const

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fixture: string }> },
) {
  if (process.env.VERCEL_ENV === 'production') {
    return new Response('Not found', { status: 404 })
  }

  const { fixture } = await params
  const document = fixtureDocuments[fixture as keyof typeof fixtureDocuments]
  if (!document) return new Response('Not found', { status: 404 })
  if (fixture === 'delayed') {
    await new Promise((resolve) => setTimeout(resolve, 900))
  }
  if (fixture === 'slow') {
    await new Promise((resolve) => setTimeout(resolve, 2500))
  }

  return new Response(document, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
