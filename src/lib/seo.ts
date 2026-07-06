/**
 * Dynamic SEO for the SPA — sets <title>, meta description, canonical,
 * Open Graph / Twitter tags, and an optional JSON-LD structured-data block.
 * Runs on mount/update and restores nothing (each page sets its own).
 */
import { useEffect } from 'react'

const SITE = 'https://playfooty.com.au'

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export interface Seo {
  title: string
  description?: string
  path?: string          // canonical path e.g. "/rankings"
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

const JSONLD_ID = 'playfooty-jsonld'

export function useSeo({ title, description, path, jsonLd }: Seo) {
  useEffect(() => {
    document.title = title
    const url = SITE + (path ?? window.location.pathname)
    if (description) upsertMeta('name', 'description', description)
    upsertMeta('property', 'og:title', title)
    if (description) upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:type', 'website')
    upsertMeta('property', 'og:url', url)
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', title)
    if (description) upsertMeta('name', 'twitter:description', description)
    upsertLink('canonical', url)

    // JSON-LD
    const existing = document.getElementById(JSONLD_ID)
    if (existing) existing.remove()
    if (jsonLd) {
      const s = document.createElement('script')
      s.type = 'application/ld+json'
      s.id = JSONLD_ID
      s.textContent = JSON.stringify(jsonLd)
      document.head.appendChild(s)
    }
    return () => { document.getElementById(JSONLD_ID)?.remove() }
  }, [title, description, path, JSON.stringify(jsonLd)])
}

export const canonicalUrl = (path: string) => SITE + path
