export const EXPECTED_MODEL_VARIANT_MANIFESTS = [
  'calming-sleep-sound-mixer.json',
  'booking-flow-handoff-simulator.json',
  'first-principles-claim-ladder-game.json',
  'tiny-festival-set-time-clash-game.json',
  'rental-walkthrough-red-flag-scorecard.json',
  'gym-mirror-progress-shot-consistency-studio.json',
  'security-cam-anomaly-timeline-game.json',
  't-shirt-print-alignment-press-game.json',
]

export const EXPECTED_MODEL_VARIANT_MANIFEST_PATHS =
  EXPECTED_MODEL_VARIANT_MANIFESTS.map(
    (fileName) => `seed-runs/model-variants/${fileName}`,
  )

// Post-launch manifests are explicitly registered here without changing the
// immutable eight-project launch cohort above. Release and Vercel evidence
// checks consume the combined list; the launch-cohort guard consumes only the
// EXPECTED_* constants.
export const ACTIVE_ADDITIONAL_MODEL_VARIANT_MANIFESTS = [
  'airlock-zero-reactor-run.json',
]

export const ALL_MODEL_VARIANT_MANIFESTS = [
  ...EXPECTED_MODEL_VARIANT_MANIFESTS,
  ...ACTIVE_ADDITIONAL_MODEL_VARIANT_MANIFESTS,
]

export const ALL_MODEL_VARIANT_MANIFEST_PATHS =
  ALL_MODEL_VARIANT_MANIFESTS.map(
    (fileName) => `seed-runs/model-variants/${fileName}`,
  )

// Immutable launch evidence. Later releases may append history, but these
// exact 24 source runs must stay inspectable in every future manifest.
export const EXPECTED_MODEL_VARIANT_LAUNCH_SOURCE_RUN_IDS = Object.freeze({
  'calming-sleep-sound-mixer.json': Object.freeze([
    'cf73efd5-2fb6-48fe-a9fd-a1a0df336d18',
    '5a9ad307-177d-4939-b3ed-cabecb236deb',
    '7d9524c0ede185b2',
  ]),
  'booking-flow-handoff-simulator.json': Object.freeze([
    '08c8b725-4228-4b24-a6e6-5d7fcf78457c',
    'c42eebed94a0395e',
    '4fcd2293646af036',
  ]),
  'first-principles-claim-ladder-game.json': Object.freeze([
    '3216db0c-fd3a-48f0-af70-58b47f34068c',
    '8c6cca2f-c67a-4fd0-9e09-81df7f9cdd0f',
    '5ef359499f3b85fa',
  ]),
  'tiny-festival-set-time-clash-game.json': Object.freeze([
    '4d02e29c-ff98-4c73-82ca-942430632443',
    'c7572f3cc2fb7c6f',
    '6a98e6ecec56a165',
  ]),
  'rental-walkthrough-red-flag-scorecard.json': Object.freeze([
    '3137def2-964d-49a8-ad22-3b776870e3fe',
    'b0472de4-e13d-453e-bf53-48cd2047412c',
    'b13bba3bcb88309c',
  ]),
  'gym-mirror-progress-shot-consistency-studio.json': Object.freeze([
    '0eea38da-ead0-44e0-b50c-ddc6840cb033',
    '415ab5f2c1b09824',
    '7306c74eb7928857',
  ]),
  'security-cam-anomaly-timeline-game.json': Object.freeze([
    '2f2bfc9f-019a-4ff3-b51f-3270a7ea9eab',
    '4f090917-f268-4811-87b7-6c0598139caa',
    '6f024f1c499a2624',
  ]),
  't-shirt-print-alignment-press-game.json': Object.freeze([
    '94e76d4a-a6e4-4fd1-9de6-9b84ff21483e',
    '43f452e6-5d3a-43d9-b8ba-8108ecf9ca35',
    '83eb2c59e82ab443',
  ]),
})
