import { connection } from 'next/server'
import ExploreClient from './ExploreClient'

export default async function ExplorePage() {
  await connection()
  return <ExploreClient />
}
