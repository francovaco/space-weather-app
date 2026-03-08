// ============================================================
// src/app/(dashboard)/space-weather/impacts/[slug]/page.tsx
// Dynamic page for each impact article
// ============================================================
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { IMPACTS, findImpact } from '@/lib/space-weather-content'
import { SpaceWeatherArticlePage } from '@/components/space-weather/SpaceWeatherArticlePage'

export function generateStaticParams() {
  return IMPACTS.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const article = findImpact(slug)
  return { title: article?.title ?? 'Impacto' }
}

export default async function ImpactPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const article = findImpact(slug)
  if (!article) notFound()
  return <SpaceWeatherArticlePage article={article} backHref="/space-weather" category="Impactos" />
}
