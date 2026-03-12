import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function fetchPage(url: string) {
  const t0 = Date.now()
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
      'Accept': 'text/html',
    },
    signal: AbortSignal.timeout(12000),
  })
  const loadTime = Date.now() - t0
  const html = await res.text()

  const title      = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || ''
  const metaDesc   = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1]
                  || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i)?.[1] || ''
  const h1s        = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => 'H1: ' + m[1].replace(/<[^>]+>/g,'').trim()).slice(0,3)
  const h2s        = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => 'H2: ' + m[1].replace(/<[^>]+>/g,'').trim()).slice(0,5)
  const hasViewport = /name=["']viewport["']/i.test(html)
  const hasMQ      = /@media\s*\(/.test(html)
  const hasSSL     = url.startsWith('https://')
  const hasSchema  = /application\/ld\+json/i.test(html)
  const hasOG      = /property=["']og:/i.test(html)
  const hasCanon   = /rel=["']canonical["']/i.test(html)
  const imgCount   = (html.match(/<img/gi) || []).length
  const missingAlt = [...html.matchAll(/<img[^>]*>/gi)].filter(m => !/alt=/i.test(m[0])).length
  const linkCount  = (html.match(/<a\s/gi) || []).length
  const ctas       = [...html.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/gi)]
                      .map(m => m[1].replace(/<[^>]+>/g,'').trim()).filter(Boolean).slice(0,8)
  const size       = Buffer.byteLength(html, 'utf8')
  const bodyText   = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5500)

  return { title, metaDesc, headings: [...h1s, ...h2s], hasViewport, hasMQ, hasSSL, hasSchema, hasOG, hasCanon, imgCount, missingAlt, linkCount, ctas, size, loadTime, bodyText }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { url, audience, industry, goal } = req.body
  if (!url) return res.status(400).json({ error: 'URL required' })

  let parsed: URL
  try { parsed = new URL(url.startsWith('http') ? url : 'https://' + url) }
  catch { return res.status(400).json({ error: 'Invalid URL' }) }

  let page: Awaited<ReturnType<typeof fetchPage>>
  try { page = await fetchPage(parsed.toString()) }
  catch (e: any) { return res.status(422).json({ error: 'Could not fetch page: ' + e.message }) }

  const context = [
    audience ? `TARGET AUDIENCE: ${audience}` : '',
    industry ? `INDUSTRY / COMPANY TYPE: ${industry}` : '',
    goal     ? `CAMPAIGN GOAL: ${goal}` : '',
  ].filter(Boolean).join('\n')

  const prompt = `You are a senior performance marketing strategist and UX expert working for Remote.com — a global Employer of Record (EOR) and payroll platform that helps companies hire internationally without setting up local entities.
 
Remote.com's key competitors are: Deel, Rippling, Oyster HR, Papaya Global, Globalization Partners.
Remote.com's ideal customer profile: HR managers, finance leaders, and founders at companies with 50-5000 employees that are hiring or expanding internationally, especially in fintech, SaaS, and tech.
Remote.com's core value propositions: owned local entities in every country (not third-party), transparent flat-fee pricing, best-in-class compliance, IP protection, and fast onboarding.
 
You are analysing a landing page and must provide a full optimisation report including personalisation recommendations. When analysing Remote.com pages, benchmark against best-in-class B2B SaaS EOR pages. When analysing competitor pages, identify weaknesses Remote.com can exploit.

URL: ${parsed.toString()}
${context}

PAGE DATA:
TITLE: ${page.title || 'MISSING'}
META DESCRIPTION: ${page.metaDesc || 'MISSING'}
HEADINGS: ${page.headings.join(' | ') || 'none found'}
SSL: ${page.hasSSL} | VIEWPORT TAG: ${page.hasViewport} | RESPONSIVE CSS: ${page.hasMQ}
STRUCTURED DATA: ${page.hasSchema} | OG TAGS: ${page.hasOG} | CANONICAL: ${page.hasCanon}
IMAGES: ${page.imgCount} total, ${page.missingAlt} missing alt text
LINKS: ${page.linkCount} | PAGE SIZE: ${Math.round(page.size/1024)}KB | RESPONSE TIME: ${page.loadTime}ms
CTAs FOUND: ${page.ctas.join(' | ') || 'none detected'}

PAGE CONTENT:
${page.bodyText}

Provide a detailed analysis. Reply in this EXACT format — do not add or remove sections:

OVERALL_SCORE: [0-100]
MOBILE_SCORE: [0-100]
SEO_SCORE: [0-100]
CRO_SCORE: [0-100]
PERF_SCORE: [0-100]
PERSONALISATION_SCORE: [0-100]

SECTION: Mobile Friendliness
STATUS: [PASS/FAIL/WARNING]
SUMMARY: [2-3 sentences on mobile readiness]
ISSUES:
- [finding → specific recommendation]
- [finding → specific recommendation]
- [finding → specific recommendation]

SECTION: SEO Optimisation
STATUS: [PASS/FAIL/WARNING]
SUMMARY: [2-3 sentences on SEO health]
ISSUES:
- [finding → specific recommendation]
- [finding → specific recommendation]
- [finding → specific recommendation]
- [finding → specific recommendation]

SECTION: Conversion Rate Optimisation
STATUS: [PASS/FAIL/WARNING]
SUMMARY: [2-3 sentences on CRO]
ISSUES:
- [finding → specific recommendation]
- [finding → specific recommendation]
- [finding → specific recommendation]
- [finding → specific recommendation]

SECTION: Page Performance
STATUS: [PASS/FAIL/WARNING]
SUMMARY: [2-3 sentences on performance]
ISSUES:
- [finding → specific recommendation]
- [finding → specific recommendation]
- [finding → specific recommendation]

SECTION: Content & Messaging
STATUS: [PASS/FAIL/WARNING]
SUMMARY: [2-3 sentences on content quality and clarity]
ISSUES:
- [finding → specific recommendation]
- [finding → specific recommendation]
- [finding → specific recommendation]

SECTION: Technical SEO
STATUS: [PASS/FAIL/WARNING]
SUMMARY: [2-3 sentences on technical setup]
ISSUES:
- [finding → specific recommendation]
- [finding → specific recommendation]
- [finding → specific recommendation]

SECTION: Personalisation Opportunities
STATUS: [PASS/FAIL/WARNING]
SUMMARY: [2-3 sentences on how well the page personalises or could personalise for different audiences. If audience/industry/goal context was provided, use it to make this specific.]
ISSUES:
- [personalisation opportunity → how to implement it, e.g. dynamic headline based on industry, geo-based social proof, funnel-stage specific CTAs]
- [personalisation opportunity → how to implement it]
- [personalisation opportunity → how to implement it]
- [personalisation opportunity → how to implement it]
- [personalisation opportunity → how to implement it]

PERSONALISATION_IDEAS:
IDEA: [QUICK WIN/STRATEGIC/ADVANCED] | [specific personalisation idea with implementation detail]
IDEA: [QUICK WIN/STRATEGIC/ADVANCED] | [specific personalisation idea with implementation detail]
IDEA: [QUICK WIN/STRATEGIC/ADVANCED] | [specific personalisation idea with implementation detail]
IDEA: [QUICK WIN/STRATEGIC/ADVANCED] | [specific personalisation idea with implementation detail]
IDEA: [QUICK WIN/STRATEGIC/ADVANCED] | [specific personalisation idea with implementation detail]

PRIORITIES:
P: HIGH | [specific actionable fix]
P: HIGH | [specific actionable fix]
P: HIGH | [specific actionable fix]
P: MEDIUM | [specific actionable fix]
P: MEDIUM | [specific actionable fix]
P: LOW | [specific actionable fix]`

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    })
    const analysis = msg.content[0].type === 'text' ? msg.content[0].text : ''
    return res.status(200).json({ url: parsed.toString(), page, analysis })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}
