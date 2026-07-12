import Link from 'next/link'
import { ArrowRight, GitFork, ListTree, Search } from 'lucide-react'

const steps = [
  {
    href: '/guide#find',
    label: 'Find',
    title: 'Start at the finished result',
    description: 'Choose something useful, playable, or close to the shape of what you need.',
    icon: Search,
  },
  {
    href: '/guide#inspect',
    label: 'Inspect',
    title: 'Reveal the path behind it',
    description: 'Read the exact prompt chain, visible responses, model settings, and attached artifacts.',
    icon: ListTree,
  },
  {
    href: '/guide#fork',
    label: 'Fork',
    title: 'Change the useful part',
    description: 'Branch from the response that matters and carry the original lineage into your version.',
    icon: GitFork,
  },
] as const

export function HomeProcess() {
  return (
    <section className="home-process" aria-labelledby="home-process-title">
      <div className="home-shell home-process-layout">
        <header>
          <p className="home-kicker">How the library works</p>
          <h2 id="home-process-title">A finished result with its working history still attached.</h2>
          <Link href="/guide">Walk through a complete example <ArrowRight aria-hidden="true" /></Link>
        </header>

        <ol>
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <li key={step.label}>
                <Link href={step.href}>
                  <span className="home-process-index">0{index + 1}</span>
                  <Icon aria-hidden="true" />
                  <span>
                    <small>{step.label}</small>
                    <strong>{step.title}</strong>
                    <p>{step.description}</p>
                  </span>
                  <ArrowRight aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
