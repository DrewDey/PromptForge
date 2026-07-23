import { notFound } from 'next/navigation'
import ProjectSubmissionClient from '@/app/build/ProjectSubmissionClient'

export const metadata = {
  robots: { index: false, follow: false },
}

export default function CommunityProjectSubmissionFixturePage() {
  if (process.env.VERCEL_ENV === 'production') notFound()

  return (
    <div data-community-project-submission-fixture>
      <ProjectSubmissionClient
        repairSubmission={null}
        requestedRepairId={null}
        publicContributorName="QA pilot builder"
      />
    </div>
  )
}
