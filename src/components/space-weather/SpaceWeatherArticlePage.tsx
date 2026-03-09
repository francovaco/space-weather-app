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
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-xs font-medium text-text-muted hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        <span>Clima Espacial</span>
        <span className="text-border">/</span>
        <span>{category}</span>
      </Link>

      {/* Title */}
      <div className="mb-10">
        <h1 className="font-display text-3xl font-bold uppercase tracking-widest text-text-primary">
          {article.title}
        </h1>
        <p className="mt-4 text-lg text-text-secondary leading-relaxed border-l-2 border-primary/30 pl-6 italic">
          {article.summary}
        </p>
      </div>

      {/* Hero Image */}
      {article.imageUrl && (
        <div className="mb-12 space-y-3">
          <div className="overflow-hidden rounded-lg border border-border bg-black aspect-[21/9]">
            <img
              src={`/api/goes/img-proxy?url=${encodeURIComponent(article.imageUrl)}`}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>
          {article.imageCaption && (
            <p className="text-center text-xs text-text-muted italic px-4">
              {article.imageCaption}
            </p>
          )}
        </div>
      )}

      {/* Content */}
      <div className="space-y-12">
        {article.sections.map((section, i) => (
          <section key={i} className="space-y-4">
            {section.heading && (
              <h2 className="font-display text-lg font-bold uppercase tracking-wider text-primary">
                {section.heading}
              </h2>
            )}
            <p className="text-base text-text-primary leading-relaxed text-justify">
              {section.body}
            </p>
          </section>
        ))}
      </div>
    </div>
  )
}
