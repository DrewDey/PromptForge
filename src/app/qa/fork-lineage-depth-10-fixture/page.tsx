import { notFound } from 'next/navigation'
import DepthTenForkLineageFixtureClient from './DepthTenForkLineageFixtureClient'

export const metadata = {
  title: 'Depth-10 fork lineage QA',
  robots: {
    index: false,
    follow: false,
  },
}

export default function DepthTenForkLineageFixturePage() {
  if (process.env.VERCEL_ENV === 'production') notFound()

  return <DepthTenForkLineageFixtureClient />
}
