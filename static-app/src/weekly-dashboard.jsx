import React, { useEffect, useState } from 'react'

const emptyReflection = { strongest_moment:'', hardest_moment:'', prayer_intention:'', next_week_priorities:'' }

export default function WeeklyDashboard({ household, supabase, localDateKey }) {
  const [data, setData] = useState(null)
  const [form, setForm] = useState(emptyReflection)
  const [history, setHistory] = useState([])
  const [msg, setMsg] = useState('')

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const end = localDateKey(), startDate = new Date(); startDate.setDate(startDate.getDate() - 6)
    const start = localDateKey(startDate)
    const [{data:settings},{data:member},{data:foods},{data:water},{data:reviews}] = await Promise.all([
      supabase.from('ft_member_settings').select('*').eq('household_id',household.id).eq('user_id',user.id).single(),
      supabase.from('ft_household_members').select('life_stage').eq('household_id',household.id).eq('user_id',user.id).single(),
      supabase.from('ft_food_logs').select('*').eq('user_id',user.id).gte('logged_on',start).lte('logged_on',end),
      supabase.from('ft_water_logs').select('*').eq('user_id',user.id).gte('logged_on',start).lte('logged_on',end),
      supabase.from('ft_weekly_reviews').select('*').eq('user_id',user.id).order('week_ending',{ascending:false}).limit(8),
    ])
    const cycle = settings?.program_cycle || 1
    const { data: checks } = await supabase.from('ft_daily_checkins').select('*').eq('user_id',user.id)
      .eq('program_cycle',cycle).order('program_day',{ascending:false}).limit(7)
    const current = (reviews || []).find(review => review.week_ending === end)
    if (current) setForm(Object.fromEntries(Object.keys(emptyReflection).map(key => [key,current[key] || ''])))
    setHistory(reviews || [])
    setData({user,end,settings:settings||{},teen:member?.life_stage==='teen',checks:(checks||[]).reverse(),foods:foods||[],water:water||[]})
  }
  useEffect(() => { load() }, [household.id])
  if (!data) return <div className="page loadingpane">Preparing your weekly dashboard…</div>

  const complete = item => ['complete','modified'].includes(item.status)
  const actionDone = (item,index) => (item.completed_actions || []).includes(index)
  const faithful = data.checks.filter(complete).length
  const faithDays = data.checks.filter(item => actionDone(item,0)).length
  const workoutDays = data.checks.filter(item => actionDone(item,1)).length
  const avgCheck = key => { const values=data.checks.map(x=>Number(x[key])).filter(x=>x>0); return values.length?values.reduce((a,b)=>a+b,0)/values.length:0 }
  const foodDates = [...new Set(data.foods.map(x=>x.logged_on))]
  const avgFood = key => foodDates.length ? data.foods.reduce((sum,item)=>sum+Number(item[key]||0),0)/foodDates.length : 0
  const stepGoal = Number(data.settings.step_goal || 7000)
  const stepGoalDays = data.checks.filter(item => Number(item.steps) >= stepGoal * ({green:1,yellow:.7,red:.4}[item.capacity] || 1)).length
  const waterByDay = data.water.reduce((days,item)=>({...days,[item.logged_on]:(days[item.logged_on]||0)+Number(item.ounces)}),{})
  const waterGoal = Number(data.settings.hydration_goal_oz || 64)
  const waterGoalDays = Object.values(waterByDay).filter(total => total >= waterGoal).length
  const weights = data.checks.filter(item => Number(item.weight_lbs)>0)
  const weightChange = weights.length>1 ? Number(weights.at(-1).weight_lbs)-Number(weights[0].weight_lbs) : null
  const latestWeight = weights.length ? Number(weights.at(-1).weight_lbs) : null
  const goalWeight = Number(data.settings.goal_weight_lbs || data.settings.goal_weight || 0)
  const score = item => (item.completed_actions?.length||0)*2 + (complete(item)?2:0) + Math.min(2,Number(item.steps||0)/Math.max(1,stepGoal))
  const ranked = [...data.checks].sort((a,b)=>score(b)-score(a))
  const strongest = ranked[0], hardest = ranked.at(-1)
  const dayLabel = item => item ? `Day ${item.program_day}` : 'Not enough data'
  const priorities=[]
  if(faithDays<5) priorities.push('Choose a consistent time and place for Scripture before the day gets crowded.')
  else priorities.push('Protect the faith rhythm that carried you through this week.')
  if(stepGoalDays<4) priorities.push('Schedule one dependable walking window on at least four days.')
  else priorities.push('Keep your current movement rhythm and make recovery deliberate.')
  if(foodDates.length<5) priorities.push('Log one repeatable meal each day; consistency matters more than perfect detail.')
  else if(avgCheck('sleep_minutes') < Number(data.settings.sleep_goal_minutes||420)) priorities.push('Protect a consistent bedtime on at least five nights.')
  else priorities.push('Prepare two reliable meals that make your nutrition goals easier.')

  async function save() {
    setMsg('Saving review…')
    const row={household_id:household.id,user_id:data.user.id,week_ending:data.end,...form,
      coach_summary:`${faithful} faithful days; ${faithDays} faith actions; ${workoutDays} body actions.`,updated_at:new Date().toISOString()}
    const { error } = await supabase.from('ft_weekly_reviews').upsert(row,{onConflict:'household_id,user_id,week_ending'})
    setMsg(error?error.message:'Weekly review saved privately.')
    if(!error) load()
  }

  return <div className="page weeklydashboard">
    <section className="weeklyhero"><p className="kicker">YOUR LAST SEVEN DAYS</p><h1>Turn the week into wisdom.</h1><p>{faithful>=5?'You built a steady week. Protect what worked and choose the next faithful step.':'This week is information, not a verdict. Make the next week easier to finish.'}</p><small>Only you can see your weight, food details, and private reflection.</small></section>
    <div className="weeklyscorecards"><article><strong>{faithful}/7</strong><span>faithful days</span></article><article><strong>{faithDays}/7</strong><span>faith actions</span></article><article><strong>{workoutDays}/7</strong><span>body actions</span></article><article><strong>{Math.round(avgCheck('steps')).toLocaleString()||'—'}</strong><span>average steps</span></article></div>
    <section className="panel"><h2>Goal consistency</h2><div className="consistencygrid"><div><strong>{stepGoalDays}/7</strong><span>adjusted step goal</span></div><div><strong>{waterGoalDays}/7</strong><span>water goal</span></div><div><strong>{foodDates.length}/7</strong><span>days food logged</span></div><div><strong>{avgCheck('sleep_minutes')?`${(avgCheck('sleep_minutes')/60).toFixed(1)}h`:'—'}</strong><span>average sleep</span></div></div></section>
    {!data.teen && <section className="panel"><h2>Nutrition averages</h2><p className="muted">Average per day that food was logged ({foodDates.length} days).</p><div className="nutritionaverage"><div><strong>{Math.round(avgFood('calories'))||'—'}</strong><span>calories</span></div><div><strong>{avgFood('protein_g')?`${avgFood('protein_g').toFixed(0)}g`:'—'}</strong><span>protein</span></div><div><strong>{avgFood('carbs_g')?`${avgFood('carbs_g').toFixed(0)}g`:'—'}</strong><span>carbs</span></div><div><strong>{avgFood('fat_g')?`${avgFood('fat_g').toFixed(0)}g`:'—'}</strong><span>fat</span></div></div></section>}
    {!data.teen && <section className="panel weightreview"><h2>Weight direction</h2><div><strong>{latestWeight?`${latestWeight.toFixed(1)} lb`:'—'}</strong><span>latest</span></div><div><strong>{weightChange===null?'—':`${weightChange>0?'+':''}${weightChange.toFixed(1)} lb`}</strong><span>seven-day change</span></div><div><strong>{latestWeight&&goalWeight?`${Math.max(0,latestWeight-goalWeight).toFixed(1)} lb`:'—'}</strong><span>to goal</span></div><p>Daily changes are noisy. Follow the direction across several weeks.</p></section>}
    <section className="panel daycontrast"><h2>Learn from both kinds of days</h2><article><span>Strongest day</span><strong>{dayLabel(strongest)}</strong><small>{strongest?`${strongest.completed_actions?.length||0} of 5 actions · ${Number(strongest.steps||0).toLocaleString()} steps`:'Keep checking in to reveal a pattern.'}</small></article><article><span>Hardest day</span><strong>{dayLabel(hardest)}</strong><small>{hardest?`${hardest.completed_actions?.length||0} of 5 actions · ${hardest.capacity||'green'} day`:'Keep checking in to reveal a pattern.'}</small></article></section>
    <section className="panel"><h2>Three priorities for next week</h2><ol className="coachpriorities">{priorities.map(item=><li key={item}>{item}</li>)}</ol></section>
    <section className="panel"><h2>Private weekly reflection</h2><div className="reviewfields"><label>What was the strongest moment?<textarea value={form.strongest_moment} onChange={e=>setForm({...form,strongest_moment:e.target.value})}/></label><label>What made the hardest day difficult?<textarea value={form.hardest_moment} onChange={e=>setForm({...form,hardest_moment:e.target.value})}/></label><label>What is your prayer intention?<textarea value={form.prayer_intention} onChange={e=>setForm({...form,prayer_intention:e.target.value})}/></label><label>What will you protect next week?<textarea value={form.next_week_priorities} onChange={e=>setForm({...form,next_week_priorities:e.target.value})}/></label></div><button className="primary" onClick={save}>Save this review</button>{msg&&<p className="message status">{msg}</p>}</section>
    {history.length>0&&<section className="panel reviewhistory"><h2>Past reviews</h2>{history.map(review=><article key={review.id}><strong>Week ending {new Date(`${review.week_ending}T12:00:00`).toLocaleDateString()}</strong><small>{review.coach_summary}</small></article>)}</section>}
  </div>
}
