// ============================================================
// src/components/space-weather/SpaceWeatherArticlePage.tsx
// Renders a single educational article (impact or phenomenon)
// ============================================================
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { SpaceWeatherArticle } from '@/lib/space-weather-content'

interface Props {
  article: SpaceWeatherArticle
  backHref: string
  category: string
}

export function SpaceWeatherArticlePage({ article, backHref, category }: Props) {
  return (
    <div className="p-4 md:p-6 max-w-3xl">
      {/* Breadcrumb */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-2xs text-text-muted hover:text-primary transition-colors mb-4"
      >
        <ArrowLeft size={12} />
        <span>Clima Espacial</span>
        <span className="text-border">/</span>
        <span>{category}</span>
      </Link>

      {/* Title */}
      <h1 className="font-display text-lg font-bold uppercase tracking-wider text-text-primary">
        {article.title}
      </h1>
      <p className="mt-1 text-xs text-text-muted leading-relaxed">
        {article.summary}
      </p>

      {/* Content */}
      <div className="mt-6 space-y-6">
        {article.sections.map((section, i) => (
          <section key={i}>
            {section.heading && (
              <h2 className="font-display text-xs font-bold uppercase tracking-wider text-primary mb-2">
                {section.heading}
              </h2>
            )}
            <p className="text-2xs text-text-secondary leading-relaxed">
              {section.body}
            </p>
          </section>
        ))}
      </div>
    </div>
  )
}
