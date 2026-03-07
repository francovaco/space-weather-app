// ============================================================
// src/app/(dashboard)/documentation/page.tsx
// ============================================================
import type { Metadata } from 'next'
import { BookOpen, ExternalLink, FileText, ChevronRight } from 'lucide-react'

export const metadata: Metadata = { title: 'Documentation' }

interface DocItem {
  title: string
  description: string
  type: 'pdf' | 'collection' | 'factsheet'
  href: string
  count?: number // for collections
  tag?: string
}

const DOCS: DocItem[] = [
  {
    title: 'GOES-R Series Data Book',
    description:
      'Comprehensive technical reference for the GOES-R series satellite system, instruments, data products, and ground segment.',
    type: 'pdf',
    href: 'https://www.goes-r.gov/resources/docs.html',
    tag: 'Technical Reference',
  },
  {
    title: 'ABI Bands Quick Information Guide',
    description:
      'Quick reference guides for all 16 Advanced Baseline Imager (ABI) bands — wavelength, resolution, primary uses, and interpretation.',
    type: 'collection',
    href: 'https://www.goes-r.gov/resources/docs.html',
    count: 16,
    tag: 'ABI · 16 bands',
  },
  {
    title: 'Advanced Baseline Imager (ABI) Fact Sheet',
    description:
      'Overview of the ABI instrument: capabilities, specifications, imaging modes, and data products.',
    type: 'factsheet',
    href: 'https://www.goes-r.gov/resources/docs.html',
    tag: 'ABI',
  },
  {
    title: 'Aerosols Fact Sheet',
    description:
      'How GOES-19 detects and quantifies aerosols, smoke, dust, and volcanic ash for air quality monitoring.',
    type: 'factsheet',
    href: 'https://www.goes-r.gov/resources/docs.html',
    tag: 'Aerosols',
  },
  {
    title: 'Cloud and Moisture Imagery Fact Sheet',
    description:
      'Description of cloud and moisture products derived from ABI — cloud top height, temperature, moisture profiles.',
    type: 'factsheet',
    href: 'https://www.goes-r.gov/resources/docs.html',
    tag: 'Clouds · Moisture',
  },
  {
    title: 'Fire Detection and Characterization Fact Sheet',
    description:
      'GOES-19 active fire detection methodology, update frequency, and integration with fire weather products.',
    type: 'factsheet',
    href: 'https://www.goes-r.gov/resources/docs.html',
    tag: 'Fire',
  },
  {
    title: 'Geostationary Lightning Mapper (GLM) Fact Sheet',
    description:
      'Overview of the GLM instrument: total lightning detection, optical energy measurement, and storm tracking applications.',
    type: 'factsheet',
    href: 'https://www.goes-r.gov/resources/docs.html',
    tag: 'GLM · Lightning',
  },
]

const TYPE_ICONS = {
  pdf: <FileText size={14} className="text-red-400" />,
  collection: <BookOpen size={14} className="text-accent-cyan" />,
  factsheet: <FileText size={14} className="text-accent-amber" />,
}

const TYPE_LABELS = {
  pdf: 'Data Book',
  collection: 'Collection',
  factsheet: 'Fact Sheet',
}

export default function DocumentationPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          Documentation
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          Official GOES-R Series technical documents, instrument guides, and fact sheets from NOAA.
        </p>
      </div>

      {/* Source link */}
      <a
        href="https://www.goes-r.gov/resources/docs.html"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-md border border-border bg-background-card px-4 py-3
                   text-xs text-text-secondary transition-colors hover:border-border-accent hover:text-text-primary"
      >
        <ExternalLink size={13} className="text-accent-cyan" />
        <span>Source: goes-r.gov/resources/docs.html</span>
        <ChevronRight size={12} className="ml-auto" />
      </a>

      {/* Document grid */}
      <div className="grid gap-3 md:grid-cols-2">
        {DOCS.map((doc) => (
          <a
            key={doc.title}
            href={doc.href}
            target="_blank"
            rel="noopener noreferrer"
            className="card flex flex-col gap-3 transition-all hover:border-border-accent hover:shadow-card"
          >
            {/* Top row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                {TYPE_ICONS[doc.type]}
                <div>
                  <p className="text-xs font-medium text-text-primary leading-snug">{doc.title}</p>
                  <p className="mt-0.5 text-2xs text-accent-cyan">{TYPE_LABELS[doc.type]}</p>
                </div>
              </div>
              <ExternalLink size={11} className="mt-0.5 shrink-0 text-text-dim" />
            </div>

            {/* Description */}
            <p className="text-2xs leading-relaxed text-text-muted">{doc.description}</p>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <span className="badge border border-border bg-background text-2xs text-text-dim">
                {doc.tag}
              </span>
              {doc.count && (
                <span className="text-2xs text-text-dim">{doc.count} files</span>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
