import type { NextRequest } from 'next/server'

const fixtureDocuments = {
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

  return new Response(document, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
