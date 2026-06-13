import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { SCOPE_CREEP_CHANGE_ORDER_CALCULATOR_GEMINI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = SCOPE_CREEP_CHANGE_ORDER_CALCULATOR_GEMINI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function ScopeCreepChangeOrderCalculatorGeminiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('scope-creep-change-order-calculator-gemini-source-run.json')}
      route="/scope-creep-change-order-calculator-gemini-demo"
      capturedAt="June 12, 2026"
    />
  )
}
