import React, { useEffect, useState } from 'react'

const blank = {
  restaurant_name: '', item_name: '', serving_label: '1 menu item',
  calories: '', protein_g: '', carbs_g: '', fat_g: '',
  source_note: 'Family verified', visibility: 'personal',
}

export default function RestaurantLibrary({ household, onLogged, supabase, localDateKey }) {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState(null)
  const [meal, setMeal] = useState('dinner')
  const [quantity, setQuantity] = useState(1)
  const [msg, setMsg] = useState('')
  const [userId, setUserId] = useState('')
  const [ownerNames, setOwnerNames] = useState({})
  const [isAdmin, setIsAdmin] = useState(false)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user.id)
    const { data: membership } = await supabase.from('ft_household_members').select('role').eq('household_id', household.id).eq('user_id', user.id).single()
    setIsAdmin(membership?.role === 'admin')
    const { data } = await supabase.from('ft_restaurant_items').select('*')
      .eq('household_id', household.id).order('updated_at', { ascending: false })
    setItems(data || [])
    const ids = [...new Set((data || []).map(item => item.owner_user_id))]
    if (ids.length) {
      const { data: profiles } = await supabase.from('ft_profiles').select('id,display_name').in('id', ids)
      setOwnerNames(Object.fromEntries((profiles || []).map(profile => [profile.id, profile.display_name])))
    }
  }
  useEffect(() => { load() }, [household.id])

  async function save() {
    if (!form.item_name.trim() || Number(form.calories) <= 0) return setMsg('Enter the item name and calories.')
    const { data: { user } } = await supabase.auth.getUser()
    const row = {
      ...form, household_id: household.id, owner_user_id: user.id,
      calories: Number(form.calories), protein_g: Number(form.protein_g || 0),
      carbs_g: Number(form.carbs_g || 0), fat_g: Number(form.fat_g || 0),
      search_terms: `${form.restaurant_name} ${form.item_name}`.toLowerCase(),
      updated_at: new Date().toISOString(),
    }
    const duplicate = !editing && items.find(item =>
      item.restaurant_name.trim().toLowerCase() === form.restaurant_name.trim().toLowerCase()
      && item.item_name.trim().toLowerCase() === form.item_name.trim().toLowerCase())
    if (duplicate && !window.confirm('This menu item is already saved. Update the existing entry instead?')) return
    const targetId = editing || duplicate?.id
    const request = targetId
      ? supabase.from('ft_restaurant_items').update(row).eq('id', targetId)
      : supabase.from('ft_restaurant_items').insert(row)
    const { error } = await request
    setMsg(error ? error.message : targetId ? 'Existing library item updated.' : 'Saved to restaurant library.')
    if (!error) { setForm(blank); setEditing(null); load(); onLogged() }
  }

  function edit(item) {
    setEditing(item.id)
    setForm(Object.fromEntries(Object.keys(blank).map(key => [key, item[key] ?? blank[key]])))
  }
  async function remove(id) {
    if (!window.confirm('Delete this saved restaurant item?')) return
    const { error } = await supabase.from('ft_restaurant_items').delete().eq('id', id)
    setMsg(error ? error.message : 'Saved item deleted.')
    if (!error) { load(); onLogged() }
  }
  async function log(item) {
    const { data: { user } } = await supabase.auth.getUser()
    const amount = Number(quantity) || 1
    const { error } = await supabase.from('ft_food_logs').insert({
      household_id: household.id, user_id: user.id, logged_on: localDateKey(), meal,
      food_name: `${item.restaurant_name ? `${item.restaurant_name} · ` : ''}${item.item_name}`,
      source: item.source_note, source_id: `library:${item.id}`, serving_label: item.serving_label,
      quantity: amount, calories: item.calories * amount, protein_g: item.protein_g * amount,
      carbs_g: item.carbs_g * amount, fat_g: item.fat_g * amount,
    })
    setMsg(error ? error.message : 'Saved restaurant item logged.')
    if (!error) onLogged()
  }

  return <div className="page restaurantlibrary"><section className="panel">
    <p className="kicker">FAMILY RESTAURANT LIBRARY</p><h2>Your reliable menu items</h2>
    <p>Save corrected nutrition once, then reuse it without searching again.</p>
    <details className="libraryeditor" open={!!editing}>
      <summary>{editing ? 'Editing saved item' : 'Add a corrected menu item'}</summary>
      <div className="libraryform">
        <label>Restaurant<input value={form.restaurant_name} onChange={e => setForm({...form, restaurant_name:e.target.value})}/></label>
        <label>Menu item<input value={form.item_name} onChange={e => setForm({...form, item_name:e.target.value})}/></label>
        <label>Serving<input value={form.serving_label} onChange={e => setForm({...form, serving_label:e.target.value})}/></label>
        {[['Calories','calories','1'],['Protein (g)','protein_g','.1'],['Carbs (g)','carbs_g','.1'],['Fat (g)','fat_g','.1']].map(([label,key,step]) =>
          <label key={key}>{label}<input type="number" min="0" step={step} value={form[key]} onChange={e => setForm({...form,[key]:e.target.value})}/></label>)}
        <label>Source note<input value={form.source_note} onChange={e => setForm({...form,source_note:e.target.value})}/></label>
        <label>Who can use it?<select value={form.visibility} onChange={e => setForm({...form,visibility:e.target.value})}><option value="personal">Only me</option><option value="household">Whole family</option></select></label>
        <div className="librarybuttons"><button className="primary" onClick={save}>{editing?'Update item':'Save item'}</button>{editing&&<button onClick={()=>{setEditing(null);setForm(blank)}}>Cancel</button>}</div>
      </div>
    </details>
    {items.length>0&&<div className="librarylist">
      <div className="libraryquick"><label>Meal<select value={meal} onChange={e=>setMeal(e.target.value)}>{['breakfast','lunch','dinner','snack','meal'].map(x=><option key={x}>{x}</option>)}</select></label><label>Servings<input type="number" min=".1" step=".25" value={quantity} onChange={e=>setQuantity(e.target.value)}/></label></div>
      {items.map(item=><article key={item.id}><div><strong>{item.restaurant_name?`${item.restaurant_name} · `:''}{item.item_name}</strong><small>{item.serving_label} · {item.calories} cal · {item.protein_g}g protein · {item.carbs_g}g carbs · {item.fat_g}g fat</small><em>{item.visibility==='household'?'Shared with family':'Personal'} · Verified by {item.owner_user_id===userId?'you':ownerNames[item.owner_user_id]||'a family member'} · {new Date(item.updated_at).toLocaleDateString()}</em><em>{item.source_note}</em></div><div><button className="primary" onClick={()=>log(item)}>Log</button>{(item.owner_user_id===userId||isAdmin)&&<><button onClick={()=>edit(item)}>Edit</button><button onClick={()=>remove(item.id)}>Delete</button></>}</div></article>)}
    </div>}
    {msg&&<p className="message status">{msg}</p>}
  </section></div>
}
