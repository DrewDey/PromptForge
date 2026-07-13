import Link from 'next/link'
import { ArrowRight, Check, Clock3, Eye, ShieldCheck, UserRound } from 'lucide-react'

const fields = [
  ['Project title', 'Travel Sleep Mixer'],
  ['AI session link', 'https://chatgpt.com/share/…'],
  ['AI service', 'ChatGPT'],
  ['Exact model', 'The model label shown in the chat'],
]

export default function GuideSubmission() {
  return (
    <section className="guide-submit guide-section" id="submit" aria-labelledby="guide-submit-title">
      <div className="guide-shell">
        <div className="guide-section-heading guide-section-heading-split">
          <div>
            <div className="guide-step-mark"><span>05</span> Bring it back</div>
            <h2 id="guide-submit-title">Turn the finished chat into a path someone else can trust.</h2>
          </div>
          <p>
            Submit the shared source run, model details, and final artifact clue. PathForge checks the
            evidence and presentation before anything becomes a public project page.
          </p>
        </div>

        <div className="guide-submit-layout">
          <div className="guide-form-window">
            <div className="guide-form-top">
              <div><span className="guide-overline">Build a path</span><strong>Share the source run</strong></div>
              <span>Draft</span>
            </div>
            <div className="guide-form-body">
              <div className="guide-form-grid">
                {fields.map(([label, value]) => (
                  <div className="guide-faux-field" key={label}>
                    <span className="guide-faux-label">{label}</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
              <div className="guide-faux-field guide-faux-field-wide">
                <span className="guide-faux-label">Notes for review</span>
                <span>Forked from response 02. The final artifact is in the last response and is ready to mount.</span>
              </div>
              <div className="guide-form-footer">
                <div><Check aria-hidden="true" /> The fork source remains attached</div>
                <Link href="/build" className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#e87a2c] px-4 text-[11px] font-bold text-white transition hover:bg-[#c95e18] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  Send to review <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>

          <div className="guide-review-story">
            <span className="guide-overline">What happens next</span>
            <ol>
              <li><div><Clock3 aria-hidden="true" /></div><span><strong>Queued for review</strong><p>Your submission appears in My Forge while it is being checked.</p></span></li>
              <li><div><ShieldCheck aria-hidden="true" /></div><span><strong>Source and artifact checked</strong><p>The conversation, model label, artifact, safety, and layout must agree.</p></span></li>
              <li><div><Eye aria-hidden="true" /></div><span><strong>Published only if it is useful</strong><p>Approved projects get a consistent public page. Weak or broken runs do not.</p></span></li>
              <li><div><UserRound aria-hidden="true" /></div><span><strong>Attached to your profile</strong><p>Your builds and forks accumulate under a real creator identity.</p></span></li>
            </ol>
            <Link href="/my-forge" className="guide-text-link">
              See how My Forge tracks your work <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="guide-quality-bar">
          <div><span className="guide-overline">A strong submission has</span><strong>One clear final artifact</strong></div>
          <span><Check aria-hidden="true" />Shared source link</span>
          <span><Check aria-hidden="true" />Visible model label</span>
          <span><Check aria-hidden="true" />Working final result</span>
          <span><Check aria-hidden="true" />Honest notes</span>
        </div>
      </div>
    </section>
  )
}
