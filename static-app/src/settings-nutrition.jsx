import React, { useEffect, useState } from 'react'

export default function NutritionGoalSettings({ household, session, supabase }) {
  const [form,setForm]=useState({calorie_goal:2000,protein_goal_g:120,carb_goal_g:200,fat_goal_g:70,hydration_goal_oz:64})
  const [msg,setMsg]=useState('')
  useEffect(()=>{supabase.from('ft_member_settings').select('calorie_goal,protein_goal_g,carb_goal_g,fat_goal_g,hydration_goal_oz').eq('household_id',household.id).eq('user_id',session.user.id).single().then(({data})=>data&&setForm(data))},[household.id,session.user.id])
  async function save(){const{error}=await supabase.from('ft_member_settings').update({...form,updated_at:new Date().toISOString()}).eq('household_id',household.id).eq('user_id',session.user.id);setMsg(error?error.message:'Food and water goals saved.')}
  return <div className="page nutritiongoalsettings"><section className="panel"><p className="kicker">FOOD &amp; WATER SETTINGS</p><h2>My daily nutrition goals</h2><p>These goals control the remaining amounts shown on Food and your water target throughout the app.</p><div className="nutritiongoalgrid">{[['Calories','calorie_goal','1'],['Protein (g)','protein_goal_g','.1'],['Carbs (g)','carb_goal_g','.1'],['Fat (g)','fat_goal_g','.1'],['Water (oz)','hydration_goal_oz','1']].map(([label,key,step])=><label key={key}>{label}<input type="number" min="0" step={step} value={form[key]??''} onChange={e=>setForm({...form,[key]:Number(e.target.value)})}/></label>)}</div><button className="primary" onClick={save}>Save food and water goals</button>{msg&&<p className="message status">{msg}</p>}</section></div>
}
