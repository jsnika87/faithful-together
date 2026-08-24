import React, { useEffect, useState } from 'react'

export default function TodayQuickWater({ supabase, localDateKey }) {
  const [state, setState] = useState({ total:0, goal:64, householdId:null, userId:null })
  const [custom, setCustom] = useState('')
  const [msg, setMsg] = useState('')
  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: household } = await supabase.from('ft_households').select('id').limit(1).single()
    const [{ data: settings }, { data: water }] = await Promise.all([
      supabase.from('ft_member_settings').select('hydration_goal_oz').eq('household_id',household.id).eq('user_id',user.id).single(),
      supabase.from('ft_water_logs').select('ounces').eq('household_id',household.id).eq('user_id',user.id).eq('logged_on',localDateKey()),
    ])
    setState({ total:(water||[]).reduce((sum,item)=>sum+Number(item.ounces),0), goal:Number(settings?.hydration_goal_oz||64), householdId:household.id, userId:user.id })
  }
  useEffect(() => { load() }, [])
  async function add(ounces) {
    const amount=Number(ounces); if(!amount||amount<=0||!state.householdId)return
    setMsg('Adding…')
    const { error }=await supabase.from('ft_water_logs').insert({household_id:state.householdId,user_id:state.userId,logged_on:localDateKey(),ounces:amount})
    setMsg(error?error.message:`Added ${amount} oz.`)
    if(!error){setCustom('');load()}
  }
  const percent=Math.min(100,Math.round(state.total/Math.max(1,state.goal)*100))
  return <div className="page todayquickwater"><section className="quickwatercard"><div><p className="kicker">QUICK ADD WATER</p><strong>{state.total} <small>of {state.goal} oz</small></strong><div className="quickwaterprogress"><span style={{width:`${percent}%`}}/></div></div><div className="quickwaterbuttons">{[8,12,16,24].map(amount=><button onClick={()=>add(amount)} key={amount}>+{amount} oz</button>)}<label><input inputMode="numeric" type="number" min="1" value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Other"/><button disabled={!Number(custom)} onClick={()=>add(custom)}>Add</button></label></div>{msg&&<small className="quickwatermsg">{msg}</small>}</section></div>
}
