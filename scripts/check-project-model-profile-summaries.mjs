import { readdirSync, readFileSync } from 'node:fs'

const MANIFEST_DIR = 'seed-runs/model-variants'
const SUMMARY_PATH = 'src/lib/project-model-profile-summaries.json'

const summaries = JSON.parse(readFileSync(SUMMARY_PATH, 'utf8'))
const expected = {}

const manifestFiles = readdirSync(MANIFEST_DIR)
  .filter((file) => file.endsWith('.json'))
  .sort((left, right) => left.localeCompare(right))

for (const fileName of manifestFiles) {
  const path = `${MANIFEST_DIR}/${fileName}`
  const candidate = JSON.parse(readFileSync(path, 'utf8'))
  if (!candidate.canonicalProjectId || !Array.isArray(candidate.variants)) continue

  expected[candidate.canonicalProjectId] = candidate.variants
    .filter((variant) => variant.qualityStatus === 'verified')
    .map((variant) => ({
      modelLabel: variant.modelLabel,
      isCurrent: variant.isCurrent,
      runRole: variant.runRole,
    }))
}

if (JSON.stringify(summaries) !== JSON.stringify(expected)) {
  console.error('Profile model summaries do not match the verified model-variant manifests.')
  process.exit(1)
}

console.log(`Profile model-summary guard passed for ${Object.keys(expected).length} projects.`)
