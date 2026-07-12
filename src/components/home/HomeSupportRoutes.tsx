import Link from 'next/link'
import { ArrowRight, Hammer, Lightbulb, MessageSquareText } from 'lucide-react'

const routes = [
  {
    href: '/what-to-build',
    eyebrow: 'I need a starting point',
    title: 'Find an idea worth an evening.',
    description: 'Choose the outcome you want, then open real paths that already point in that direction.',
    action: 'Open Ideas',
    icon: Lightbulb,
  },
  {
    href: '/requests',
    eyebrow: 'I need help making it',
    title: 'Ask the community for a build.',
    description: 'Post the outcome you want, add the constraints that matter, and let builders respond.',
    action: 'Open Requests',
    icon: MessageSquareText,
  },
] as const

export function HomeSupportRoutes() {
  return (
    <section className="home-support" aria-labelledby="home-support-title">
      <div className="home-shell">
        <header className="home-support-heading">
          <p className="home-kicker">When the catalog does not have it yet</p>
          <h2 id="home-support-title">Two ways to make the missing path happen.</h2>
          <p>Choose a sharper starting direction or put a concrete need on the community board. If you already made the result, share the complete run below.</p>
        </header>

        <div className="home-support-grid">
          {routes.map((route) => {
            const Icon = route.icon
            return (
              <Link key={route.href} href={route.href} className="home-support-card">
                <Icon aria-hidden="true" />
                <span>
                  <small>{route.eyebrow}</small>
                  <strong>{route.title}</strong>
                  <p>{route.description}</p>
                </span>
                <span className="home-support-action">{route.action} <ArrowRight aria-hidden="true" /></span>
              </Link>
            )
          })}

          <aside className="home-contribute">
            <Hammer aria-hidden="true" />
            <div>
              <small>Already made something?</small>
              <h3>Keep the prompts, responses, and artifact together.</h3>
              <p>Share the source run so someone else can inspect the work and carry it forward.</p>
            </div>
            <Link href="/build">Share a build <ArrowRight aria-hidden="true" /></Link>
          </aside>
        </div>
      </div>
    </section>
  )
}
