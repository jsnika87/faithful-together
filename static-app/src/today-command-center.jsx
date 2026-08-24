import React, { useEffect, useState } from 'react'

export default function TodayCommandCenter({ supabase, localDateKey }) {
  const [state,setState]=useState(null)
  async function load(){
    const {data:{user}}=await supabase.auth.getUser(); const {data:h}=await supabase.from('ft_households').select('id').limit(1).single(); const today=localDateKey()
    const [{data:s},{data:tasks},{data:food},{data:water},{data:checks},{data:{session}}]=await Promise.all([
      supabase.from('ft_member_settings').select('*').eq('household_id',h.id).eq('user_id',user.id).single(),
      supabase.from('ft_tasks').select('*').eq('assigned_to',user.id).eq('due_date',today).eq('status','open').order('due_time'),
      supabase.from('ft_food_logs').select('calories,protein_g').eq('user_id',user.id).eq('logged_on',today),
      supabase.from('ft_water_logs').select('ounces').eq('user_id',user.id).eq('logged_on',today),
      supabase.from('ft_daily_checkins').select('*').eq('user_id',user.id).order('program_cycle',{ascending:false}).order('program_day',{ascending:false}).limit(1),
      supabase.auth.getSession(),
    ])
    let events=[]; try{const x=await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ft-google-calendar`,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'events'})}).then(r=>r.json());events=(x.events||[]).filter(e=>(e.start.includes('T')?localDateKey(e.start):e.start)===today).slice(0,3)}catch{}
    setState({s:s||{},tasks:tasks||[],food:food||[],water:water||[],check:checks?.[0],events})
  }
  useEffect(()=>{load()},[])
  if(!state)return null
  const calories=state.food.reduce((a,x)=>a+Number(x.calories||0),0),protein=state.food.reduce((a,x)=>a+Number(x.protein_g||0),0),water=state.water.reduce((a,x)=>a+Number(x.ounces||0),0),done=state.check?.completed_actions?.length||0
  const hour=new Date().getHours(),period=hour<12?'Morning':hour<17?'Afternoon':'Evening'
  const next=state.events.find(e=>!e.start.includes('T')||new Date(e.start)>new Date())
  return <div className="page commandcenter"><section className="commandhero"><div><p className="kicker">{period.toUpperCase()} COMMAND CENTER</p><h2>{done<5?`${5-done} faithful step${5-done===1?'':'s'} still available today.`:'Your five faithful steps are complete.'}</h2><p>{next?`Next: ${next.title}${next.start.includes('T')?` at ${new Date(next.start).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}`:''}.`:state.tasks.length?`${state.tasks.length} planned task${state.tasks.length===1?'':'s'} remain today.`:'Your schedule has room for the next right step.'}</p></div><div className="commandpulse"><span style={{'--value':`${done/5*100}%`}}><strong>{done}/5</strong><small>steps</small></span></div></section><div className="commandgrid"><article><span>Schedule</span><strong>{state.events.length}</strong><small>events today</small></article><article><span>Tasks</span><strong>{state.tasks.length}</strong><small>still open</small></article><article><span>Fuel</span><strong>{Math.round(calories)}</strong><small>cal · {Math.round(protein)}g protein</small></article><article><span>Hydration</span><strong>{water}</strong><small>of {state.s.hydration_goal_oz||64} oz</small></article></div></div>
}
