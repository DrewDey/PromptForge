import Link from 'next/link'
import type { Metadata } from 'next'
import {
  ArrowRight,
  CheckCircle2,
  ClipboardPenLine,
  Lightbulb,
  Search,
} from 'lucide-react'
import BuildRequestSubmitForm from '@/components/BuildRequestSubmitForm'
import { BuildRequestCard } from '@/components/requests/BuildRequestCard'
import { getPublicBuildRequests, getUserBuildRequestVotes } from '@/lib/data'
import { canonicalMetadata } from '@/lib/site-url'
import styles from './requests.module.css'

export const metadata: Metadata = {
  title: 'Request an AI Build Path | PathForge',
  description: 'Ask the PathForge community for a real AI build path, fork, or finished artifact for the project you want to see built.',
  ...canonicalMetadata('/requests'),
}

const SUPABASE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function getViewer() {
  if (!SUPABASE_CONFIGURED) return null

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch {
    return null
  }
}

function loginHref(next: string) {
  return `/auth/login?next=${encodeURIComponent(next)}`
}

function signupHref(next: string) {
  return `/auth/signup?next=${encodeURIComponent(next)}`
}

const EMPTY_REQUEST_EXAMPLES = [
  ['Make a routine usable', 'A one-file meal planner that turns pantry staples into a realistic week.'],
  ['Make a decision clearer', 'A moving-cost comparison that shows the tradeoffs, not only the total.'],
  ['Make learning active', 'A small game that teaches a concept through the decisions the player makes.'],
]

export default async function BuildRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>
}) {
  const params = await searchParams
  const [viewer, requests] = await Promise.all([
    getViewer(),
    getPublicBuildRequests(),
  ])
  const votedRequestIds = viewer
    ? await getUserBuildRequestVotes(requests.map(request => request.id))
    : new Set<string>()

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <div className={styles.kicker}>
          <ClipboardPenLine aria-hidden="true" />
          Community request desk
        </div>

        <div className={styles.introGrid}>
          <div>
            <h1>Put a useful build on the board.</h1>
            <p>
              Ask for a tool, game, workflow, or build path that should exist. Builders can answer with the real PathForge result.
            </p>
          </div>

          <nav className={styles.introActions} aria-label="Build request shortcuts">
            <Link href="/paths?panel=open">
              <Search aria-hidden="true" />
              Search existing paths first
            </Link>
            <Link href="#post-request" className={styles.primaryAction}>
              Write a build brief
              <ArrowRight aria-hidden="true" />
            </Link>
          </nav>
        </div>

        {params.submitted && (
          <div className={styles.submittedBanner} role="status">
            <CheckCircle2 aria-hidden="true" />
            Your build request is on the community board.
          </div>
        )}
      </header>

      <div className={styles.workspace}>
        <section className={styles.queue} aria-labelledby="request-queue-heading">
          <div className={styles.queueHeading}>
            <div>
              <span>Public board</span>
              <h2 id="request-queue-heading">
                {requests.length > 0 ? 'What should be built next?' : 'No open requests yet.'}
              </h2>
            </div>
            <div className={styles.queueCount} aria-label={`${requests.length} public ${requests.length === 1 ? 'request' : 'requests'}`}>
              <strong>{requests.length.toString().padStart(2, '0')}</strong>
              <span>on board</span>
            </div>
          </div>

          {requests.length === 0 ? (
            <div className={styles.emptyBoard}>
              <div className={styles.emptyLead}>
                <span className={styles.boardPin} aria-hidden="true" />
                <h3>The board is empty, not unfinished.</h3>
                <p>
                  PathForge does not fill this space with made-up demand. A strong first brief is specific about the outcome and leaves room for a builder to solve it well.
                </p>
                <Link href={viewer ? '#post-request' : loginHref('/requests')}>
                  {viewer ? 'Post the first brief' : 'Log in to post a brief'}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </div>

              <div className={styles.exampleBriefs} aria-label="Build request examples">
                <p>Useful directions to start from</p>
                {EMPTY_REQUEST_EXAMPLES.map(([title, body], index) => (
                  <article key={title}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <h4>{title}</h4>
                      <p>{body}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.requestList}>
              {requests.map((request, index) => (
                <BuildRequestCard
                  key={request.id}
                  request={request}
                  requestNumber={index + 1}
                  isAuthenticated={Boolean(viewer)}
                  hasVoted={votedRequestIds.has(request.id)}
                />
              ))}
            </div>
          )}
        </section>

        <aside className={styles.sidebar}>
          <section id="post-request" className={styles.composer} aria-labelledby="post-request-heading">
            <div className={styles.composerHeader}>
              <span>New brief</span>
              <h2 id="post-request-heading">Request a build</h2>
              <p>Name the result, who it helps, and what must work when it is done.</p>
            </div>

            {viewer ? (
              <div className={styles.composerForm}>
                <BuildRequestSubmitForm />
              </div>
            ) : (
              <div className={styles.signInPrompt}>
                <h3>Use a real account to post.</h3>
                <p>Requests, responses, and votes stay attached to real PathForge profiles.</p>
                <div>
                  <Link href={loginHref('/requests')}>Log in</Link>
                  <Link href={signupHref('/requests')}>Create an account</Link>
                </div>
              </div>
            )}

            <div className={styles.briefNotes}>
              <div>
                <span>01</span>
                <p><strong>Describe the finish line.</strong> Ask for the thing someone can use, not a vague topic.</p>
              </div>
              <div>
                <span>02</span>
                <p><strong>Add the must-work moment.</strong> Say what would make the answer genuinely useful.</p>
              </div>
            </div>
          </section>

          <div className={styles.feedbackNote}>
            <Lightbulb aria-hidden="true" />
            <p>
              <strong>Trying to improve PathForge itself?</strong>{' '}
              Bugs, interface feedback, and site ideas belong in the{' '}
              <Link href="/suggestion-box">Suggestion Box</Link>.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
