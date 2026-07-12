const chapters = [
  ['01', 'Find a result', '#find'],
  ['02', 'Read the path', '#inspect'],
  ['03', 'Fork a response', '#fork'],
  ['04', 'Run the change', '#run'],
  ['05', 'Bring it back', '#submit'],
]

export default function GuideRail() {
  return (
    <nav className="guide-rail" aria-label="Walkthrough chapters">
      <div className="guide-shell guide-rail-inner">
        <span className="guide-rail-label">Your route</span>
        <ol>
          {chapters.map(([number, label, href]) => (
            <li key={number}>
              <a href={href}>
                <span>{number}</span>
                {label}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  )
}
