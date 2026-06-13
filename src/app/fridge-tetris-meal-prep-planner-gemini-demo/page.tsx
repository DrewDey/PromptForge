import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { FRIDGE_TETRIS_MEAL_PREP_PLANNER_GEMINI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = FRIDGE_TETRIS_MEAL_PREP_PLANNER_GEMINI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function FridgeTetrisMealPrepPlannerGeminiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('fridge-tetris-meal-prep-planner-gemini-source-run.json')}
      route="/fridge-tetris-meal-prep-planner-gemini-demo"
      capturedAt="June 12, 2026"
    />
  )
}
