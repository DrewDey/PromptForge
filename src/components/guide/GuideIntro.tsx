import Link from 'next/link'
import { ArrowDownRight, Box, GitFork, Route } from 'lucide-react'

const concepts = [
  {
    icon: Box,
    accent: 'dark',
    title: 'Artifact',
    body: 'The working thing the model made: a tool, game, planner, file, or other usable result.',
  },
  {
    icon: Route,
    accent: 'orange',
    title: 'Build path',
    body: 'The exact prompts and responses that produced the artifact, in the order they happened.',
  },
  {
    icon: GitFork,
    accent: 'green',
    title: 'Fork',
    body: 'A new project continued from one exact response, with the original path still attached.',
  },
]

export default function GuideIntro() {
  return (
    <section className="guide-intro" aria-labelledby="guide-intro-title">
      <div className="guide-shell">
        <div className="guide-intro-head">
          <div>
            <div className="guide-eyebrow">PathForge in plain English</div>
            <h2 id="guide-intro-title">It is a map of the work, <em>not another AI model.</em></h2>
          </div>
          <p>
            You still build in ChatGPT, Claude, Gemini, or the model you prefer. PathForge makes the
            useful work discoverable, inspectable, and reusable after the chat is over.
          </p>
        </div>

        <div className="guide-concept-grid">
          {concepts.map(({ icon: Icon, accent, title, body }) => (
            <article className={`guide-concept guide-concept-${accent}`} key={title}>
              <div className="guide-concept-icon"><Icon aria-hidden="true" /></div>
              <div><h3>{title}</h3><p>{body}</p></div>
            </article>
          ))}
        </div>

        <div className="guide-route-picker">
          <div className="guide-route-label">Choose where you are starting</div>
          <div className="guide-route-links">
            <a href="#find">
              <span>Find something useful</span>
              <strong>I want a proven place to start</strong>
              <ArrowDownRight aria-hidden="true" />
            </a>
            <a href="#fork">
              <span>Adapt an existing project</span>
              <strong>I know what I want to change</strong>
              <ArrowDownRight aria-hidden="true" />
            </a>
            <Link href="/build">
              <span>Share a finished run</span>
              <strong>I already made something good</strong>
              <ArrowDownRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
