import PolicyPage from '@/components/PolicyPage'

export default function CommunityGuidelinesPage() {
  return (
    <PolicyPage eyebrow="Invitation-only pilot" title="Community Guidelines" intro="Submit work that is useful to inspect, honest about its evidence, and safe for another person to open.">
      <section><h2>Required</h2><ul><li>Submit only projects you personally built; the pilot does not accept submissions on someone else&apos;s behalf.</li><li>Label the evidence as complete, selected excerpts, or reconstructed notes without exaggerating it.</li><li>Remove secrets, personal data, confidential material, and unrelated conversation content.</li><li>Use only a public provider share link and choose deliberately whether it may appear publicly.</li><li>Respect the reuse choice and attribution of source projects.</li></ul></section>
      <section><h2>Not allowed</h2><ul><li>Malware, credential theft, tracking, network beacons, sandbox escape attempts, or deceptive downloads.</li><li>Harassment, threats, hateful abuse, sexual exploitation, or content that endangers a child.</li><li>Copyright or trademark infringement, impersonation, plagiarism, or false authorship/model claims.</li><li>Doxxing, private records, real financial credentials, health records, or identifying information submitted without permission.</li><li>Spam, duplicate evasion, review manipulation, or attempts to bypass pilot limits.</li></ul></section>
      <section><h2>Enforcement</h2><p>PathForge may request repair, decline, suspend, remove, or restrict an account. Reports are reviewed with the project’s evidence and lifecycle record. Immediate suspension is used when continued access could cause harm.</p></section>
    </PolicyPage>
  )
}
