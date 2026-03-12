import Head from 'next/head'
import { useState } from 'react'

const C = {
  bg: '#0a0a0f', surface: '#111118', surface2: '#1a1a24',
  border: '#2a2a3a', accent: '#00e5a0', text: '#e8e8f0',
  muted: '#666680', danger: '#ff4d6d', warn: '#ffb347', purple: '#6c63ff',
}
const sx = (o: Record<string, any>) => o as React.CSSProperties

/* ── Score Ring ── */
function Ring({ score, label }: { score: number; label: string }) {
  const r = 30, circ = 2 * Math.PI * r
  const col = score >= 70 ? '#00e5a0' : score >= 40 ? '#ffb347' : '#ff4d6d'
  const offset = circ - (score / 100) * circ
  return (
    <div style={sx({ display:'flex', flexDirection:'column', alignItems:'center', gap:6 })}>
      <div style={sx({ position:'relative', width:72, height:72 })}>
        <svg width="72" height="72" viewBox="0 0 72 72" style={sx({ transform:'rotate(-90deg)' })}>
          <circle cx="36" cy="36" r={r} fill="none" stroke="#2a2a3a" strokeWidth="6"/>
          <circle cx="36" cy="36" r={r} fill="none" stroke={col} strokeWidth="6"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={sx({ transition:'stroke-dashoffset 1s ease' })}/>
        </svg>
        <div style={sx({ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' })}>
          <span style={sx({ fontFamily:'Syne,sans-serif', fontSize:17, fontWeight:800, color:col })}>{score}</span>
        </div>
      </div>
      <span style={sx({ fontSize:10, letterSpacing:1, textTransform:'uppercase', color:C.muted })}>{label}</span>
    </div>
  )
}

/* ── Status Badge ── */
function Badge({ status }: { status: string }) {
  const u = status.toUpperCase()
  const cfg = u === 'PASS'
    ? { bg:'rgba(0,229,160,.12)', color:'#00e5a0', border:'rgba(0,229,160,.3)', label:'✓ Pass' }
    : u === 'FAIL'
    ? { bg:'rgba(255,77,109,.12)', color:'#ff4d6d', border:'rgba(255,77,109,.3)', label:'✗ Fail' }
    : { bg:'rgba(255,179,71,.12)', color:'#ffb347', border:'rgba(255,179,71,.3)', label:'⚠ Warning' }
  return (
    <span style={sx({ background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, fontSize:10, padding:'3px 9px', borderRadius:4, letterSpacing:1, textTransform:'uppercase', fontWeight:500 })}>
      {cfg.label}
    </span>
  )
}

/* ── Section Card ── */
function Section({ sec, i, accent }: { sec: any; i: number; accent?: string }) {
  const [open, setOpen] = useState(true)
  const col = accent || C.accent
  return (
    <div style={sx({ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' })}>
      <button onClick={() => setOpen(!open)}
        style={sx({ width:'100%', padding:'13px 18px', background:C.surface2, border:'none', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', color:C.text })}>
        <div style={sx({ display:'flex', alignItems:'center', gap:10 })}>
          <span style={sx({ fontFamily:'Syne,sans-serif', fontSize:10, fontWeight:700, color:col, width:22 })}>{String(i+1).padStart(2,'0')}</span>
          <span style={sx({ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700 })}>{sec.title}</span>
          <Badge status={sec.status}/>
        </div>
        <span style={sx({ color:C.muted, display:'inline-block', transform:open?'rotate(180deg)':'none', transition:'transform .2s' })}>▾</span>
      </button>
      {open && (
        <div style={sx({ padding:18 })}>
          <p style={sx({ fontSize:13, color:C.text, lineHeight:1.75, marginBottom:12 })}>{sec.summary}</p>
          <div style={sx({ display:'flex', flexDirection:'column', gap:7 })}>
            {sec.issues.map((issue: string, j: number) => (
              <div key={j} style={sx({ display:'flex', gap:10, alignItems:'flex-start', background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, padding:'9px 13px', fontSize:12, color:C.text, lineHeight:1.65 })}>
                <span style={sx({ color:col, flexShrink:0, marginTop:2 })}>→</span>
                {issue}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Parser ── */
function parse(text: string) {
  const n = (k: string) => parseInt(text.match(new RegExp(k + ':\\s*(\\d+)'))?.[1] || '0')
  const overall = n('OVERALL_SCORE'), mobile = n('MOBILE_SCORE'), seo = n('SEO_SCORE')
  const cro = n('CRO_SCORE'), perf = n('PERF_SCORE'), personalisation = n('PERSONALISATION_SCORE')

  const secRe = /SECTION:\s*(.+?)\nSTATUS:\s*(.+?)\nSUMMARY:\s*([\s\S]*?)ISSUES:\s*([\s\S]*?)(?=SECTION:|PERSONALISATION_IDEAS:|PRIORITIES:|$)/g
  const sections: any[] = []; let m
  while ((m = secRe.exec(text)) !== null) {
    sections.push({
      title: m[1].trim(), status: m[2].trim(), summary: m[3].trim(),
      issues: m[4].trim().split('\n').map((l: string) => l.replace(/^-\s*/, '').trim()).filter(Boolean),
    })
  }

  const ideaRe = /IDEA:\s*(QUICK WIN|STRATEGIC|ADVANCED)\s*\|\s*(.+)/g
  const ideas: any[] = []
  while ((m = ideaRe.exec(text)) !== null) ideas.push({ type: m[1], text: m[2].trim() })

  const prioRe = /P:\s*(HIGH|MEDIUM|LOW)\s*\|\s*(.+)/g
  const priorities: any[] = []
  while ((m = prioRe.exec(text)) !== null) priorities.push({ level: m[1], text: m[2].trim() })

  return { overall, mobile, seo, cro, perf, personalisation, sections, ideas, priorities }
}

/* ── Main Page ── */
export default function Home() {
  const [url, setUrl]           = useState('')
  const [audience, setAudience] = useState('')
  const [industry, setIndustry] = useState('')
  const [goal, setGoal]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [loadMsg, setLoadMsg]   = useState('')
  const [result, setResult]     = useState<any>(null)
  const [error, setError]       = useState('')
  const [copied, setCopied]     = useState(false)
  const [showContext, setShowContext] = useState(false)

  const msgs = [
    'Fetching page content...', 'Checking mobile responsiveness...',
    'Analysing SEO signals...', 'Evaluating conversion elements...',
    'Identifying personalisation opportunities...', 'Building report...',
  ]

  async function analyse() {
    const u = url.trim(); if (!u) return
    setLoading(true); setError(''); setResult(null); setLoadMsg(msgs[0])
    let i = 0
    const iv = setInterval(() => { i++; setLoadMsg(msgs[i % msgs.length]) }, 2500)
    try {
      const res = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: u, audience, industry, goal }),
      })
      const data = await res.json()
      clearInterval(iv)
      if (!res.ok || data.error) { setError(data.error || 'Analysis failed'); setLoading(false); return }
      setResult(data)
    } catch (e: any) { clearInterval(iv); setError('Network error — please try again.') }
    setLoading(false)
  }

  const parsed = result ? parse(result.analysis) : null

  const chip = (label: string, on: boolean, col = '#00e5a0') => (
    <span key={label} style={sx({ fontSize:10, padding:'3px 8px', borderRadius:4, letterSpacing:1, background:on?col+'18':'transparent', color:on?col:'#333', border:`1px solid ${on?col+'44':'#2a2a3a'}` })}>
      {on ? '✓' : '✗'} {label}
    </span>
  )

  const ideaColor = (type: string) =>
    type === 'QUICK WIN' ? '#00e5a0' : type === 'STRATEGIC' ? '#ffb347' : '#6c63ff'

  const suggestions = ['remote.com', 'remote.com/employer-of-record', 'deel.com', 'rippling.com']

  return (
    <>
      <Head>
        <title>Landing Page Analyser — Remote.com</title>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
      </Head>
      <div style={sx({ position:'relative', zIndex:1, maxWidth:880, margin:'0 auto', padding:'48px 24px' })}>

        {/* Header */}
        <div style={sx({ marginBottom:32 })}>
          <div style={sx({ display:'flex', alignItems:'center', gap:12, marginBottom:10 })}>
            <div style={sx({ width:34, height:34, background:C.accent, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 })}>⚡</div>
            <span style={sx({ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:19 })}>
              Landing Page <span style={sx({ color:C.accent })}>Analyser</span>
            </span>
            <span style={sx({ fontSize:11, padding:'3px 9px', borderRadius:20, border:`1px solid ${C.border}`, color:C.muted, letterSpacing:1 })}>Remote.com</span>
          </div>
          <p style={sx({ fontSize:13, color:C.muted, lineHeight:1.65 })}>
            Enter any URL — Claude analyses mobile, SEO, CRO, performance, content, and generates personalisation recommendations tailored to your audience.
          </p>
        </div>

        {/* Input Card */}
        <div style={sx({ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:22, marginBottom:16 })}>

          {/* URL row */}
          <label style={sx({ fontSize:10, color:C.muted, letterSpacing:1, textTransform:'uppercase', display:'block', marginBottom:9 })}>Page URL</label>
          <div style={sx({ display:'flex', gap:10, marginBottom:12 })}>
            <input type="text" value={url} onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && analyse()}
              placeholder="https://remote.com/employer-of-record"
              style={sx({ flex:1, background:C.surface2, border:`1px solid ${C.border}`, borderRadius:9, padding:'13px 15px', color:C.text, fontSize:14, outline:'none' })}/>
            <button onClick={analyse} disabled={loading || !url.trim()}
              style={sx({ padding:'13px 26px', background:loading?C.surface2:C.accent, color:loading?C.muted:'#000', border:'none', borderRadius:9, fontSize:14, fontWeight:700, cursor:loading?'not-allowed':'pointer', transition:'all .2s', whiteSpace:'nowrap' })}>
              {loading ? 'Analysing...' : 'Analyse →'}
            </button>
          </div>

          {/* Quick suggestions */}
          <div style={sx({ display:'flex', gap:7, flexWrap:'wrap', marginBottom:16 })}>
            {suggestions.map(s => (
              <button key={s} onClick={() => setUrl('https://'+s)}
                style={sx({ fontSize:11, padding:'4px 10px', background:C.surface2, border:`1px solid ${C.border}`, borderRadius:5, color:C.muted, cursor:'pointer' })}>
                {s}
              </button>
            ))}
          </div>

          {/* Personalisation context toggle */}
          <button onClick={() => setShowContext(!showContext)}
            style={sx({ display:'flex', alignItems:'center', gap:8, fontSize:12, color:showContext?C.accent:C.muted, background:'none', border:'none', cursor:'pointer', padding:0, transition:'color .2s' })}>
            <span style={sx({ display:'inline-block', transform:showContext?'rotate(90deg)':'none', transition:'transform .2s' })}>▶</span>
            Add personalisation context <span style={sx({ fontSize:10, color:C.muted, letterSpacing:1 })}>(optional — makes recommendations more specific)</span>
          </button>

          {showContext && (
            <div style={sx({ marginTop:14, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 })}>
              <div>
                <label style={sx({ fontSize:10, color:C.muted, letterSpacing:1, textTransform:'uppercase', display:'block', marginBottom:7 })}>Target Audience</label>
                <input type="text" value={audience} onChange={e => setAudience(e.target.value)}
                  placeholder="e.g. HR managers at Series B startups"
                  style={sx({ width:'100%', background:C.surface2, border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 13px', color:C.text, fontSize:12, outline:'none' })}/>
              </div>
              <div>
                <label style={sx({ fontSize:10, color:C.muted, letterSpacing:1, textTransform:'uppercase', display:'block', marginBottom:7 })}>Industry / Segment</label>
                <input type="text" value={industry} onChange={e => setIndustry(e.target.value)}
                  placeholder="e.g. Fintech, Healthcare, SaaS"
                  style={sx({ width:'100%', background:C.surface2, border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 13px', color:C.text, fontSize:12, outline:'none' })}/>
              </div>
              <div>
                <label style={sx({ fontSize:10, color:C.muted, letterSpacing:1, textTransform:'uppercase', display:'block', marginBottom:7 })}>Campaign Goal</label>
                <select value={goal} onChange={e => setGoal(e.target.value)}
                  style={sx({ width:'100%', background:C.surface2, border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 13px', color:goal?C.text:C.muted, fontSize:12, outline:'none', appearance:'none' })}>
                  <option value="">Select goal...</option>
                  <option value="demo request">Demo Request</option>
                  <option value="free trial signup">Free Trial Signup</option>
                  <option value="lead generation">Lead Generation</option>
                  <option value="competitor conquest">Competitor Conquest</option>
                  <option value="brand awareness">Brand Awareness</option>
                  <option value="upsell / expansion">Upsell / Expansion</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={sx({ background:'rgba(255,77,109,.1)', border:'1px solid rgba(255,77,109,.3)', borderRadius:10, padding:'13px 18px', marginBottom:16, fontSize:13, color:C.danger })}>
            ✗ {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={sx({ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:'44px 24px', textAlign:'center', marginBottom:16 })}>
            <div style={sx({ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:700, marginBottom:18 })}>Analysing page...</div>
            <div style={sx({ height:3, background:C.border, borderRadius:3, overflow:'hidden', maxWidth:280, margin:'0 auto 14px' })}>
              <div className="loadbar" style={sx({ height:'100%', background:C.accent, borderRadius:3 })}/>
            </div>
            <div style={sx({ fontSize:12, color:C.muted })}>{loadMsg}</div>
          </div>
        )}

        {/* Results */}
        {result && parsed && !loading && (
          <div className="fadeUp">

            {/* Score overview */}
            <div style={sx({ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden', marginBottom:14 })}>
              <div style={sx({ background:C.surface2, padding:'16px 22px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 })}>
                <div>
                  <div style={sx({ fontSize:10, color:C.muted, letterSpacing:1, textTransform:'uppercase', marginBottom:3 })}>Analysis Complete</div>
                  <div style={sx({ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700 })}>{result.page?.title || result.url}</div>
                  <div style={sx({ fontSize:11, color:C.muted, marginTop:2 })}>{result.url}</div>
                </div>
                <div style={sx({ display:'flex', gap:5, flexWrap:'wrap' })}>
                  {chip('SSL', result.page?.hasSSL)}
                  {chip('Viewport', result.page?.hasViewport)}
                  {chip('Schema', result.page?.hasSchema, '#6c63ff')}
                  {chip('OG', result.page?.hasOG, '#6c63ff')}
                  {chip('Canonical', result.page?.hasCanon, '#6c63ff')}
                </div>
              </div>
              <div style={sx({ padding:'24px 22px' })}>
                {/* Score rings — 6 including personalisation */}
                <div style={sx({ display:'flex', justifyContent:'space-around', flexWrap:'wrap', gap:16, marginBottom:22 })}>
                  <Ring score={parsed.overall}        label="Overall"/>
                  <Ring score={parsed.mobile}         label="Mobile"/>
                  <Ring score={parsed.seo}            label="SEO"/>
                  <Ring score={parsed.cro}            label="CRO"/>
                  <Ring score={parsed.perf}           label="Performance"/>
                  <Ring score={parsed.personalisation} label="Personalisation"/>
                </div>
                {/* Quick stats */}
                <div style={sx({ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))', gap:9 })}>
                  {[
                    { l:'Page Size',   v:`${Math.round((result.page?.size||0)/1024)}KB` },
                    { l:'Response',    v:`${result.page?.loadTime||0}ms` },
                    { l:'Images',      v:result.page?.imgCount||0 },
                    { l:'Missing Alt', v:result.page?.missingAlt||0 },
                    { l:'Links',       v:result.page?.linkCount||0 },
                    { l:'CTAs',        v:result.page?.ctas?.length||0 },
                  ].map(stat => (
                    <div key={stat.l} style={sx({ background:C.surface2, border:`1px solid ${C.border}`, borderRadius:7, padding:'11px 13px', textAlign:'center' })}>
                      <div style={sx({ fontFamily:'Syne,sans-serif', fontSize:17, fontWeight:800 })}>{stat.v}</div>
                      <div style={sx({ fontSize:10, color:C.muted, letterSpacing:1, textTransform:'uppercase', marginTop:2 })}>{stat.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Priority Actions */}
            {parsed.priorities.length > 0 && (
              <div style={sx({ background:C.surface, border:'1px solid rgba(255,77,109,.35)', borderRadius:14, padding:'16px 22px', marginBottom:14 })}>
                <div style={sx({ fontFamily:'Syne,sans-serif', fontSize:11, fontWeight:700, marginBottom:12, color:C.danger, letterSpacing:1, textTransform:'uppercase' })}>★ Priority Actions</div>
                <div style={sx({ display:'flex', flexDirection:'column', gap:7 })}>
                  {parsed.priorities.map((p: any, i: number) => (
                    <div key={i} style={sx({ display:'flex', gap:10, alignItems:'flex-start', background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, padding:'9px 13px' })}>
                      <span style={sx({ fontSize:9, padding:'3px 7px', borderRadius:3, textTransform:'uppercase', letterSpacing:1, fontWeight:600, flexShrink:0, marginTop:2, background:p.level==='HIGH'?C.danger:p.level==='MEDIUM'?C.warn:C.muted, color:'#fff' })}>
                        {p.level}
                      </span>
                      <span style={sx({ fontSize:12, color:C.text, lineHeight:1.6 })}>{p.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Personalisation Ideas — highlighted separately */}
            {parsed.ideas.length > 0 && (
              <div style={sx({ background:C.surface, border:`1px solid ${C.purple}44`, borderRadius:14, padding:'16px 22px', marginBottom:14 })}>
                <div style={sx({ display:'flex', alignItems:'center', gap:10, marginBottom:14 })}>
                  <span style={sx({ fontFamily:'Syne,sans-serif', fontSize:11, fontWeight:700, color:C.purple, letterSpacing:1, textTransform:'uppercase' })}>◈ Personalisation Ideas</span>
                  <span style={sx({ fontSize:10, color:C.muted })}>— tailored to {audience || 'your audience'}</span>
                </div>
                <div style={sx({ display:'flex', flexDirection:'column', gap:8 })}>
                  {parsed.ideas.map((idea: any, i: number) => (
                    <div key={i} style={sx({ display:'flex', gap:10, alignItems:'flex-start', background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, padding:'10px 14px' })}>
                      <span style={sx({ fontSize:9, padding:'3px 8px', borderRadius:3, textTransform:'uppercase', letterSpacing:1, fontWeight:600, flexShrink:0, marginTop:2, background:ideaColor(idea.type)+'22', color:ideaColor(idea.type), border:`1px solid ${ideaColor(idea.type)}44` })}>
                        {idea.type}
                      </span>
                      <span style={sx({ fontSize:12, color:C.text, lineHeight:1.65 })}>{idea.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Sections */}
            <div style={sx({ display:'flex', flexDirection:'column', gap:10, marginBottom:18 })}>
              {parsed.sections.map((sec: any, i: number) => (
                <Section key={i} sec={sec} i={i} accent={sec.title.toLowerCase().includes('personal') ? C.purple : C.accent}/>
              ))}
            </div>

            {/* Copy report */}
            <div style={sx({ display:'flex', justifyContent:'flex-end' })}>
              <button onClick={() => {
                navigator.clipboard.writeText(`LANDING PAGE ANALYSIS\n${result.url}\n\n${result.analysis}`)
                setCopied(true); setTimeout(() => setCopied(false), 2000)
              }} style={sx({ padding:'10px 18px', background:C.surface2, border:`1px solid ${C.border}`, borderRadius:8, fontSize:12, cursor:'pointer', color:C.text, fontFamily:'DM Mono,monospace' })}>
                {copied ? '✓ Copied!' : '↗ Copy Report'}
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && !error && (
          <div style={sx({ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:'60px 24px', textAlign:'center' })}>
            <div style={sx({ fontFamily:'Syne,sans-serif', fontSize:40, fontWeight:800, color:C.border, marginBottom:14 })}>↑</div>
            <div style={sx({ fontFamily:'Syne,sans-serif', fontSize:17, fontWeight:700, color:C.muted, marginBottom:8 })}>Enter a URL to get started</div>
            <div style={sx({ fontSize:12, color:C.muted, lineHeight:1.8 })}>
              Claude analyses mobile, SEO, CRO, performance, and content —<br/>
              plus generates <span style={sx({ color:C.purple })}>personalisation recommendations</span> tailored to your audience.<br/>
              Add audience context above for more specific ideas.
            </div>
          </div>
        )}
      </div>
    </>
  )
}
