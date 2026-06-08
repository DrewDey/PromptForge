import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPathDetailMetadata } from '@/lib/build-path-metadata'
import { POPUP_DINNER_SEATING_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export const metadata = buildPathDetailMetadata(POPUP_DINNER_SEATING_SHOWCASE_PROJECT)

export default function PopUpDinnerSeatingMixerDemoPage() {
  return (
    <PreparedSourceRunPage
      project={POPUP_DINNER_SEATING_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('popup-dinner-seating-mixer-gemini-source-run.json')}
      route="/pop-up-dinner-seating-mixer-demo"
      capturedAt="June 6, 2026"
    />
  )
}
