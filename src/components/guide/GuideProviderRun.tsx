import Image from 'next/image'
import { Check, FileUp, Link2, MessageSquareText, Share2 } from 'lucide-react'

const runSteps = [
  {
    icon: MessageSquareText,
    number: '1',
    title: 'Open the model you want',
    body: 'ChatGPT, Claude, Gemini, or another supported service still does the actual generation.',
  },
  {
    icon: FileUp,
    number: '2',
    title: 'Bring the current artifact',
    body: 'Attach the latest file. If the provider cannot take it, paste the complete artifact code.',
  },
  {
    icon: Share2,
    number: '3',
    title: 'Ask for one clear change',
    body: 'Continue naturally. Keep the request specific enough that the result can be checked.',
  },
  {
    icon: Link2,
    number: '4',
    title: 'Share the finished chat',
    body: 'Copy the provider session link after the response and artifact are complete.',
  },
]

const providerControls = [
  {
    name: 'ChatGPT',
    image: '/screenshots/guide/chatgpt-prompt-controls.jpg',
    width: 780,
    height: 56,
    note: 'Use + to attach the artifact. Copy the conversation with Share when the run is finished.',
  },
  {
    name: 'Claude',
    image: '/screenshots/guide/claude-attach-controls.jpg',
    width: 690,
    height: 220,
    note: 'Use +, Code, or a file source. Record the exact model label visible in the composer.',
  },
  {
    name: 'Gemini',
    image: '/screenshots/guide/gemini-prompt-controls.jpg',
    width: 690,
    height: 92,
    note: 'Use + for the current artifact, then keep the change request in that same message.',
  },
]

export default function GuideProviderRun() {
  return (
    <section className="guide-run guide-section" id="run" aria-labelledby="guide-run-title">
      <div className="guide-run-grid" aria-hidden="true" />
      <div className="guide-shell">
        <div className="guide-section-heading guide-section-heading-dark guide-section-heading-split">
          <div>
            <div className="guide-step-mark"><span>04</span> Run the change</div>
            <h2 id="guide-run-title">PathForge keeps the lineage. You give the model the file and the change.</h2>
          </div>
          <p>
            PathForge preserves which response and artifact you are continuing. In the provider chat,
            attach or paste that current artifact and ask for the new direction you want.
          </p>
        </div>

        <div className="guide-run-steps">
          {runSteps.map(({ icon: Icon, number, title, body }) => (
            <article key={number}>
              <div className="guide-run-step-top"><span>{number}</span><Icon aria-hidden="true" /></div>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>

        <div className="guide-chat-scene">
          <div className="guide-chat-window">
            <div className="guide-chat-top">
              <span className="guide-provider-dot guide-provider-chatgpt" />
              <div><span>New provider chat</span><strong>Continue the selected fork</strong></div>
              <span className="guide-model-label">Chosen model shown here</span>
            </div>
            <div className="guide-chat-context">
              <div className="guide-file-card">
                <FileUp aria-hidden="true" />
                <div><strong>sleep-sound-mixer-final.html</strong><span>Current artifact from response 02</span></div>
                <Check aria-hidden="true" />
              </div>
              <div className="guide-chat-bubble">
                <span>You</span>
                <p>
                  Keep the mixer offline. Add a “Travel” preset that favors fan noise, and make the
                  timer usable with the keyboard. Return the complete updated HTML.
                </p>
              </div>
              <div className="guide-chat-response">
                <span>Model</span>
                <div><i /><i /><i /></div>
                <p>Complete updated artifact returned in the same source conversation.</p>
              </div>
            </div>
          </div>

          <aside className="guide-context-checklist">
            <span className="guide-overline">Before you send</span>
            <h3>The model needs two things.</h3>
            <div><strong>1</strong><p><b>The current artifact</b><br />The file or complete code you are continuing.</p></div>
            <div><strong>2</strong><p><b>The change you want</b><br />Plain language is fine. Be concrete about the outcome.</p></div>
            <p className="guide-context-note">PathForge remembers the fork point; you still attach or paste the file in the provider chat.</p>
          </aside>
        </div>

        <details className="guide-provider-help">
          <summary>
            <span><span className="guide-overline">Provider reference</span><strong>Where do I attach the artifact?</strong></span>
            <span className="guide-details-action">Show ChatGPT, Claude, and Gemini controls</span>
          </summary>
          <div className="guide-provider-grid">
            {providerControls.map((provider) => (
              <article key={provider.name}>
                <div className="guide-provider-head"><span className={`guide-provider-dot guide-provider-${provider.name.toLowerCase()}`} /><strong>{provider.name}</strong></div>
                <div className="guide-provider-image">
                  <Image
                    src={provider.image}
                    alt={`${provider.name} prompt controls`}
                    width={provider.width}
                    height={provider.height}
                  />
                </div>
                <p>{provider.note}</p>
              </article>
            ))}
          </div>
          <p className="guide-provider-caveat">
            Provider interfaces change. The reliable pattern is the same: choose the model, attach or
            paste the current artifact, send the change, then share the finished conversation.
          </p>
        </details>
      </div>
    </section>
  )
}
