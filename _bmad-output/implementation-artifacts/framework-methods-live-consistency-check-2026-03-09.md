# Framework Methods Live Consistency Check (2026-03-09)

## Scope
- Compared canonical methods from docs/raw_practices/framework_methods.md
- Against live methods returned by GET /api/v1/practices (all pages)

## Canonical Method List
- Scrum
- Kanban
- XP
- Lean
- Scaled Agile
- Product Management
- Design Thinking & UX
- Project Management
- Agile
- Facilitation & Workshops

## Live API Results
- Total practices fetched: 235
- Live methods:
  - Agile
  - Design Thinking & UX
  - Facilitation & Workshops
  - Kanban
  - Lean
  - Product Management
  - Project Management
  - Scaled Agile
  - Scrum
  - XP

## Consistency Outcome
- Missing from live: none
- Extra in live: none
- Empty/null method values: 0

## Distribution (count by method)
- Agile: 23
- Design Thinking & UX: 26
- Facilitation & Workshops: 92
- Kanban: 5
- Lean: 17
- Product Management: 21
- Project Management: 12
- Scaled Agile: 6
- Scrum: 10
- XP: 23

## Verification Command
```powershell
node -e "const canonical=['Scrum','Kanban','XP','Lean','Scaled Agile','Product Management','Design Thinking & UX','Project Management','Agile','Facilitation & Workshops']; const base='http://localhost:3000/api/v1/practices'; (async()=>{ const first=await fetch(base+'?page=1&pageSize=100'); if(!first.ok) throw new Error('HTTP '+first.status); const d1=await first.json(); const total=d1.total||0; const pageSize=d1.pageSize||100; const totalPages=Math.max(1,Math.ceil(total/pageSize)); const items=[...(d1.items||[])]; for(let p=2;p<=totalPages;p++){ const r=await fetch(base+'?page='+p+'&pageSize='+pageSize); if(!r.ok) throw new Error('HTTP '+r.status+' page '+p); const d=await r.json(); items.push(...(d.items||[])); } const live=[...new Set(items.map(x=>x.method).filter(Boolean).map(s=>String(s).trim()))].sort((a,b)=>a.localeCompare(b)); const canonSet=new Set(canonical); const liveSet=new Set(live); const missing=canonical.filter(m=>!liveSet.has(m)); const extra=live.filter(m=>!canonSet.has(m)); const counts=items.reduce((acc,it)=>{ const m=(it.method||'__EMPTY__'); acc[m]=(acc[m]||0)+1; return acc; },{}); console.log('PRACTICES_TOTAL='+items.length); console.log('LIVE_METHODS='+JSON.stringify(live)); console.log('MISSING_FROM_LIVE='+JSON.stringify(missing)); console.log('EXTRA_IN_LIVE='+JSON.stringify(extra)); console.log('EMPTY_METHOD_COUNT='+(counts['__EMPTY__']||0)); console.log('METHOD_COUNTS='+JSON.stringify(Object.fromEntries(Object.entries(counts).filter(([k])=>k!=='__EMPTY__').sort((a,b)=>a[0].localeCompare(b[0])))); })().catch(e=>{ console.error('VERIFY_ERROR',e.message); process.exit(1); });"
```
