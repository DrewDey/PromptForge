/* Axonometric model-run stack — design concept, not wired into any live page.
 *
 * The site already stores a genuinely three-dimensional fact and flattens it
 * into a dropdown that reads "3 model runs". The three axes are:
 *
 *   X (horizontal)  prompt sequence within one run
 *   Z (vertical)    which model run
 *   Y (in-plane)    the run's own working surface, drawn as depth
 *
 * Drawing Z as real depth makes the comparison legible: every run answers the
 * byte-identical opening prompt, so the length of each slab is the amount of
 * work that model needed to reach a working artifact. The ragged right edge is
 * the finding, not decoration.
 *
 * Projection is a fixed dimetric basis, hand-computed so every edge lands on a
 * crisp hairline. Each run is drawn as a thin slab rather than a bare outline —
 * the extruded front and left faces are what make it read as a plane instead of
 * a squashed line. No 3D library, no client JS: this renders on the server.
 */

export type RunPlane = {
  serviceLabel: string
  modelLabel: string
  modelSettings: string
  promptCount: number
  repairPromptCount: number
  qualityStatus: string
  isDefaultRun: boolean
}

type Props = {
  runs: RunPlane[]
  /** 'full' draws the annotated blueprint. 'glyph' drops text for card use. */
  variant?: 'full' | 'glyph'
  openingPromptShaShort?: string
}

/* ── Projection basis ───────────────────────────────────────────────────────
 * EY carries a steeper rise than a true isometric so the slab faces stay
 * readable at card scale without the stack growing tall. */
const EY = { x: 0.5, y: -0.42 }

function proj(x: number, y: number, z: number) {
  return { x: x + y * EY.x, y: y * EY.y - z }
}

const PLANE_DEPTH = 168
const SLAB = 7 // extruded thickness
const RUN_GAP = 196
const FIRST_PROMPT_X = 92
const PROMPT_PITCH = 164
const ARTIFACT_GAP = 132
const PLANE_TAIL = 60
const CENTER_Y = PLANE_DEPTH / 2

const INK = '#18181b'
const HAIRLINE = '#e4e4e7'
const EDGE_SHADE = '#e9e9ec'
const MUTED = '#62626b'
const ORANGE = '#e87a2c'
const ORANGE_INK = '#a8470d'
const VERIFIED = '#2bd15f'
const VERIFIED_INK = '#07551f'
const WARN = '#f59e0b'
const WARN_INK = '#92400e'

function promptX(index: number) {
  return FIRST_PROMPT_X + index * PROMPT_PITCH
}

function artifactX(promptCount: number) {
  return promptX(promptCount - 1) + ARTIFACT_GAP
}

function pts(points: { x: number; y: number }[]) {
  return points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
}

/** A square that lies flat in its run's plane, so nodes obey the projection. */
function planarSquare(x: number, y: number, z: number, size: number) {
  return pts([
    proj(x - size, y - size, z),
    proj(x + size, y - size, z),
    proj(x + size, y + size, z),
    proj(x - size, y + size, z),
  ])
}

/* The slab's visible thickness carries the run's verdict. A full-length tinted
 * strip reads as intentional; a colour patch on the left edge degenerates into
 * a sliver under this projection and looks like a rendering fault. */
function qualityColors(run: RunPlane) {
  if (run.qualityStatus === 'known-issue') {
    return { edge: '#fef3c7', edgeLine: WARN, ink: WARN_INK }
  }
  return { edge: '#e2f8ea', edgeLine: VERIFIED, ink: VERIFIED_INK }
}

export function ModelRunStackDiagram({
  runs,
  variant = 'full',
  openingPromptShaShort,
}: Props) {
  const isGlyph = variant === 'glyph'

  // Runs are drawn shortest-first from the top, so prompt count reads as a
  // staircase down the stack.
  const ordered = [...runs].sort((a, b) => a.promptCount - b.promptCount)
  const topZ = (ordered.length - 1) * RUN_GAP
  const maxPromptCount = Math.max(...ordered.map((run) => run.promptCount))
  const widestPlane = Math.max(
    ...ordered.map((run) => artifactX(run.promptCount) + PLANE_TAIL),
  )

  const contentWidth = widestPlane + PLANE_DEPTH * EY.x
  const contentHeight = PLANE_DEPTH * -EY.y + topZ + SLAB

  const padLeft = isGlyph ? 14 : 152
  const padTop = isGlyph ? 14 : 96
  const padRight = isGlyph ? 14 : 234
  const padBottom = isGlyph ? 14 : 76

  const viewWidth = padLeft + contentWidth + padRight
  const viewHeight = padTop + contentHeight + padBottom
  const originY = padTop + PLANE_DEPTH * -EY.y + topZ

  const titleId = `run-stack-title-${variant}`
  const descId = `run-stack-desc-${variant}`

  // Single string children: interpolated JSX inside <title>/<desc> splits into
  // multiple text nodes and trips React hydration.
  const titleText = `Axonometric stack of ${ordered.length} model ${
    ordered.length === 1 ? 'run' : 'runs'
  } of one build path`
  const descText = `Each slab is one model run answering the same opening prompt. Slab length shows how many prompts that model needed to reach a working artifact: ${ordered
    .map(
      (run) =>
        `${run.serviceLabel} ${run.modelLabel}, ${run.promptCount} ${
          run.promptCount === 1 ? 'prompt' : 'prompts'
        }${run.repairPromptCount > 0 ? ` including ${run.repairPromptCount} repair` : ''}, ${
          run.qualityStatus === 'known-issue' ? 'known issue' : 'verified'
        }`,
    )
    .join('; ')}.`

  return (
    <svg
      viewBox={`0 0 ${viewWidth.toFixed(0)} ${viewHeight.toFixed(0)}`}
      role="img"
      aria-labelledby={`${titleId} ${descId}`}
      shapeRendering="geometricPrecision"
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <title id={titleId}>{titleText}</title>
      <desc id={descId}>{descText}</desc>

      <g transform={`translate(${padLeft} ${originY})`}>
        {/* ── Hidden through-lines, drafting convention: dashed, drawn under
             the slabs so they only show in the gaps between runs. ────────── */}
        {ordered.length > 1 && (
          <line
            x1={proj(promptX(0), CENTER_Y, topZ).x}
            y1={proj(promptX(0), CENTER_Y, topZ).y}
            x2={proj(promptX(0), CENTER_Y, 0).x}
            y2={proj(promptX(0), CENTER_Y, 0).y}
            stroke={ORANGE}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}

        {Array.from({ length: Math.max(maxPromptCount - 1, 0) }, (_, offset) => {
          const column = offset + 1
          const zs = ordered
            .map((run, index) => ({ run, index }))
            .filter(({ run }) => run.promptCount > column)
            .map(({ index }) => (ordered.length - 1 - index) * RUN_GAP)
          if (zs.length < 2) return null
          const a = proj(promptX(column), CENTER_Y, Math.max(...zs))
          const b = proj(promptX(column), CENTER_Y, Math.min(...zs))
          return (
            <line
              key={`tie-${column}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={HAIRLINE}
              strokeWidth={1}
              strokeDasharray="2 4"
            />
          )
        })}

        {/* ── Run slabs, back (top) to front (bottom) ─────────────────────── */}
        {ordered.map((run, runIndex) => {
          const z = (ordered.length - 1 - runIndex) * RUN_GAP
          const length = artifactX(run.promptCount) + PLANE_TAIL
          const quality = qualityColors(run)

          const backLeft = proj(0, PLANE_DEPTH, z)
          const backRight = proj(length, PLANE_DEPTH, z)
          const frontRight = proj(length, 0, z)
          const frontLeft = proj(0, 0, z)
          const drop = (p: { x: number; y: number }) => ({
            x: p.x,
            y: p.y + SLAB,
          })

          const spineStart = proj(36, CENTER_Y, z)
          const spineEnd = proj(artifactX(run.promptCount), CENTER_Y, z)
          const labelAnchor = proj(0, CENTER_Y, z)
          const verdictX = proj(length, PLANE_DEPTH * 0.34, z).x + 22
          const verdictY = proj(length, PLANE_DEPTH * 0.34, z).y

          return (
            <g key={`${run.serviceLabel}-${run.modelLabel}`}>
              {/* Front face: the extrusion that sells the slab, tinted by the
                  run's verdict so quality reads without a floating marker. */}
              <polygon
                points={pts([
                  frontLeft,
                  frontRight,
                  drop(frontRight),
                  drop(frontLeft),
                ])}
                fill={quality.edge}
                stroke={quality.edgeLine}
                strokeWidth={1}
              />
              {/* Left face: neutral, just closes the corner. */}
              <polygon
                points={pts([backLeft, frontLeft, drop(frontLeft), drop(backLeft)])}
                fill={EDGE_SHADE}
                stroke={HAIRLINE}
                strokeWidth={1}
              />
              {/* Top face */}
              <polygon
                points={pts([backLeft, backRight, frontRight, frontLeft])}
                fill={run.isDefaultRun ? '#ffffff' : '#fcfcfd'}
                stroke={run.isDefaultRun ? INK : '#d9d9de'}
                strokeWidth={run.isDefaultRun ? 1.5 : 1}
              />

              {/* Prompt spine */}
              <line
                x1={spineStart.x}
                y1={spineStart.y}
                x2={spineEnd.x}
                y2={spineEnd.y}
                stroke={INK}
                strokeWidth={1}
              />

              {/* Opening prompt is shared; later nodes are repairs. */}
              {Array.from({ length: run.promptCount }, (_, promptIndex) => {
                const isOpening = promptIndex === 0
                return (
                  <polygon
                    key={`node-${promptIndex}`}
                    points={planarSquare(
                      promptX(promptIndex),
                      CENTER_Y,
                      z,
                      11,
                    )}
                    fill={isOpening ? '#ffffff' : ORANGE}
                    stroke={isOpening ? INK : ORANGE_INK}
                    strokeWidth={1.5}
                  />
                )
              })}

              {/* Artifact node terminates the run. */}
              <polygon
                points={planarSquare(
                  artifactX(run.promptCount),
                  CENTER_Y,
                  z,
                  15,
                )}
                fill={run.qualityStatus === 'known-issue' ? '#fffbeb' : INK}
                stroke={run.qualityStatus === 'known-issue' ? WARN_INK : INK}
                strokeWidth={1.6}
              />

              {!isGlyph && (
                <>
                  {/* Run identity, left gutter */}
                  <text
                    x={labelAnchor.x - 22}
                    y={labelAnchor.y - 3}
                    textAnchor="end"
                    fill={INK}
                    fontSize={15}
                    fontWeight={850}
                    letterSpacing="-0.02em"
                  >
                    {run.serviceLabel}
                  </text>
                  <text
                    x={labelAnchor.x - 22}
                    y={labelAnchor.y + 13}
                    textAnchor="end"
                    fill={MUTED}
                    fontSize={10}
                    fontFamily="var(--font-mono)"
                    letterSpacing="0.06em"
                  >
                    {run.modelLabel}
                  </text>

                  {/* Verdict, clear of the slab's right edge */}
                  <text
                    x={verdictX}
                    y={verdictY}
                    fill={quality.ink}
                    fontSize={9}
                    fontWeight={800}
                    fontFamily="var(--font-mono)"
                    letterSpacing="0.14em"
                  >
                    {run.qualityStatus === 'known-issue'
                      ? 'KNOWN ISSUE'
                      : 'VERIFIED'}
                  </text>
                  <text
                    x={verdictX}
                    y={verdictY + 15}
                    fill={MUTED}
                    fontSize={9}
                    fontFamily="var(--font-mono)"
                    letterSpacing="0.1em"
                  >
                    {`${run.promptCount} ${
                      run.promptCount === 1 ? 'PROMPT' : 'PROMPTS'
                    }${
                      run.repairPromptCount > 0
                        ? ` · ${run.repairPromptCount} REPAIR`
                        : ''
                    }`}
                  </text>
                  {run.isDefaultRun && (
                    <text
                      x={verdictX}
                      y={verdictY + 30}
                      fill={ORANGE_INK}
                      fontSize={9}
                      fontWeight={800}
                      fontFamily="var(--font-mono)"
                      letterSpacing="0.14em"
                    >
                      DEFAULT RUN
                    </text>
                  )}
                </>
              )}
            </g>
          )
        })}

        {/* ── Axis annotation ─────────────────────────────────────────────── */}
        {!isGlyph && (
          <>
            {Array.from({ length: maxPromptCount }, (_, promptIndex) => {
              const anchor = proj(promptX(promptIndex), CENTER_Y, topZ)
              // Ticks start clear of the top slab's back edge so no guide line
              // is drawn across a plane it does not belong to.
              const tickBase =
                proj(promptX(promptIndex), PLANE_DEPTH, topZ).y - 9
              return (
                <g key={`axis-${promptIndex}`}>
                  <line
                    x1={anchor.x}
                    y1={tickBase}
                    x2={anchor.x}
                    y2={tickBase - 22}
                    stroke={HAIRLINE}
                    strokeWidth={1}
                  />
                  <text
                    x={anchor.x}
                    y={tickBase - 32}
                    textAnchor="middle"
                    fill={promptIndex === 0 ? ORANGE_INK : MUTED}
                    fontSize={9}
                    fontWeight={800}
                    fontFamily="var(--font-mono)"
                    letterSpacing="0.14em"
                  >
                    {promptIndex === 0
                      ? 'OPENING PROMPT'
                      : `REPAIR 0${promptIndex}`}
                  </text>
                </g>
              )
            })}

            {openingPromptShaShort && (
              <text
                x={proj(promptX(0), CENTER_Y, topZ).x}
                y={proj(0, PLANE_DEPTH, topZ).y - 9 - 50}
                textAnchor="middle"
                fill={MUTED}
                fontSize={8}
                fontFamily="var(--font-mono)"
                letterSpacing="0.08em"
              >
                {`IDENTICAL ACROSS RUNS · sha ${openingPromptShaShort}`}
              </text>
            )}

            {/* Axis captions sit below the front slab, clear of the extrusion. */}
            <text
              x={proj(0, 0, 0).x - 22}
              y={SLAB + 46}
              textAnchor="end"
              fill={MUTED}
              fontSize={8}
              fontWeight={800}
              fontFamily="var(--font-mono)"
              letterSpacing="0.14em"
            >
              MODEL RUN ↑
            </text>
            <text
              x={proj(promptX(0), 0, 0).x - 12}
              y={SLAB + 46}
              fill={MUTED}
              fontSize={8}
              fontWeight={800}
              fontFamily="var(--font-mono)"
              letterSpacing="0.14em"
            >
              PROMPT SEQUENCE →
            </text>
          </>
        )}
      </g>
    </svg>
  )
}
