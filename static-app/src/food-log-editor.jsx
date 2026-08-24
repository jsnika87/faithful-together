import React, { useEffect, useState } from 'react'

const meals = ['breakfast', 'lunch', 'dinner', 'snack', 'meal']

export default function FoodLogEditor({ household, supabase, localDateKey, onChanged }) {
  const [logs, setLogs] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(null)
  const [msg, setMsg] = useState('')

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('ft_food_logs').select('*').eq('household_id', household.id)
      .eq('user_id', user.id).eq('logged_on', localDateKey()).order('created_at')
    setLogs(data || [])
  }
  useEffect(() => { load() }, [household.id])

  function start(log) {
    setEditing(log.id)
    setForm({ food_name: log.food_name, serving_label: log.serving_label || '', quantity: log.quantity,
      meal: log.meal, calories: log.calories, protein_g: log.protein_g, carbs_g: log.carbs_g, fat_g: log.fat_g })
  }
  async function save() {
    const row = { ...form, quantity: Number(form.quantity), calories: Number(form.calories),
      protein_g: Number(form.protein_g), carbs_g: Number(form.carbs_g), fat_g: Number(form.fat_g) }
    const { error } = await supabase.from('ft_food_logs').update(row).eq('id', editing)
    setMsg(error ? error.message : 'Food entry updated.')
    if (!error) { setEditing(null); setForm(null); await load(); onChanged() }
  }
  async function remove(id) {
    if (!window.confirm('Delete this food entry?')) return
    const { error } = await supabase.from('ft_food_logs').delete().eq('id', id)
    setMsg(error ? error.message : 'Food entry deleted.')
    if (!error) { await load(); onChanged() }
  }

  if (!logs.length) return null
  return <div className="page foodlogmanager"><section className="panel"><h2>Today’s food</h2>
    {logs.map(log => <article key={log.id}>
      {editing === log.id ? <div className="foodlogedit">
        <label>Food<input value={form.food_name} onChange={e => setForm({...form, food_name:e.target.value})}/></label>
        <label>Serving<input value={form.serving_label} onChange={e => setForm({...form, serving_label:e.target.value})}/></label>
        <label>Quantity<input type="number" min=".01" step=".25" value={form.quantity} onChange={e => setForm({...form, quantity:e.target.value})}/></label>
        <label>Meal<select value={form.meal} onChange={e => setForm({...form, meal:e.target.value})}>{meals.map(x => <option key={x}>{x}</option>)}</select></label>
        {[['Calories','calories','1'],['Protein (g)','protein_g','.1'],['Carbs (g)','carbs_g','.1'],['Fat (g)','fat_g','.1']].map(([label,key,step]) => <label key={key}>{label}<input type="number" min="0" step={step} value={form[key]} onChange={e => setForm({...form,[key]:e.target.value})}/></label>)}
        <div className="foodlogactions"><button className="primary" onClick={save}>Save changes</button><button onClick={() => { setEditing(null); setForm(null) }}>Cancel</button></div>
      </div> : <><div><strong>{log.food_name}</strong><small>{log.quantity} × {log.serving_label} · {log.meal}</small><small>{Math.round(log.calories)} cal · {Number(log.protein_g).toFixed(1)}g protein · {Number(log.carbs_g).toFixed(1)}g carbs · {Number(log.fat_g).toFixed(1)}g fat</small></div><div className="foodlogactions"><button onClick={() => start(log)}>Edit</button><button className="danger" onClick={() => remove(log.id)}>Delete</button></div></>}
    </article>)}
    {msg && <p className="message status">{msg}</p>}
  </section></div>
}
