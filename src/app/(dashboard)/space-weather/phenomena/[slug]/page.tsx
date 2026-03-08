// ============================================================
// src/app/(dashboard)/space-weather/phenomena/[slug]/page.tsx
// Dynamic page for each phenomenon article
// ============================================================
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PHENOMENA, findPhenomenon } from '@/lib/space-weather-content'
import { SpaceWeatherArticlePage } from '@/components/space-weather/SpaceWeatherArticlePage'

export function generateStaticParams() {
  return PHENOMENA.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const article = findPhenomenon(slug)
  return { title: article?.title ?? 'Fenómeno' }
}

export default async function PhenomenonPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const article = findPhenomenon(slug)
  if (!article) notFound()
  return <SpaceWeatherArticlePage article={article} backHref="/space-weather" category="Fenómenos" />
}
