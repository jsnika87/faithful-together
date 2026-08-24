import React, { useState } from 'react'

export default function RestaurantPhraseLibrary({ household, onLogged, supabase, localDateKey }) {
  const [text, setText] = useState('')
  const [items, setItems] = useState([])
  const [meal, setMeal] = useState('dinner')
  const [visibility, setVisibility] = useState('personal')
  const [msg, setMsg] = useState('')

  async function calculate() {
    setMsg('Matching the meal…')
    const { data: { session } } = await supabase.auth.getSession()
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ft-food-search`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restaurant_phrase', text }),
    })
    const result = await response.json()
    setItems((result.items || []).map(item => ({ ...item, saved: false })))
    setMsg(result.error || result.disclaimer || '')
  }

  function edit(index, key, value) {
    setItems(items.map((item, i) => i === index
      ? { ...item, [key]: ['quantity', 'calories', 'protein_g', 'carbs_g', 'fat_g'].includes(key) ? Math.max(0, Number(value)) : value, saved: false }
      : item))
  }

  async function saveToLibrary(item, index) {
    if (!item.name?.trim() || Number(item.calories) <= 0) return setMsg('Enter an item name and calories before saving.')
    const { data: { user } } = await supabase.auth.getUser()
    const restaurant = item.brand || ''
    const row = {
      household_id: household.id,
      owner_user_id: user.id,
      visibility,
      restaurant_name: restaurant,
      item_name: item.name,
      serving_label: item.serving_label || '1 menu item',
      calories: Number(item.calories),
      protein_g: Number(item.protein_g || 0),
      carbs_g: Number(item.carbs_g || 0),
      fat_g: Number(item.fat_g || 0),
      source_note: item.note || item.source || 'Family verified',
      search_terms: `${restaurant} ${item.name} ${item.input || ''}`.toLowerCase(),
    }
    const { error } = await supabase.from('ft_restaurant_items').insert(row)
    setMsg(error ? error.message : `Saved “${item.name}” to the ${visibility === 'household' ? 'family' : 'personal'} library.`)
    if (!error) setItems(items.map((entry, i) => i === index ? { ...entry, saved: true } : entry))
  }

  const totals = items.reduce((sum, item) => ({
    calories: sum.calories + item.calories * item.quantity,
    protein_g: sum.protein_g + item.protein_g * item.quantity,
    carbs_g: sum.carbs_g + item.carbs_g * item.quantity,
    fat_g: sum.fat_g + item.fat_g * item.quantity,
  }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })

  async function log() {
    const { data: { user } } = await supabase.auth.getUser()
    const rows = items.filter(item => item.quantity > 0).map(item => ({
      household_id: household.id, user_id: user.id, logged_on: localDateKey(), meal,
      food_name: `${item.brand ? `${item.brand} · ` : ''}${item.name}`,
      source: item.source || 'Restaurant estimate', source_id: String(item.id),
      serving_label: item.serving_label, quantity: item.quantity,
      calories: item.calories * item.quantity, protein_g: item.protein_g * item.quantity,
      carbs_g: item.carbs_g * item.quantity, fat_g: item.fat_g * item.quantity,
    }))
    const { error } = await supabase.from('ft_food_logs').insert(rows)
    setMsg(error ? error.message : 'Restaurant meal logged.')
    if (!error) { setText(''); setItems([]); onLogged() }
  }

  return <div className="page restaurantphrase"><section className="panel">
    <p className="kicker">DESCRIBE A RESTAURANT MEAL</p><h2>Say what you actually ate</h2>
    <p>Review and correct the matched food. If it is right, save it once and your family can reuse it from the library above.</p>
    <textarea value={text} onChange={e => setText(e.target.value)} placeholder="1/2 of a Bubba's 33 crispy chicken salad with extra ranch"/>
    <div className="phraseactions"><select value={meal} onChange={e => setMeal(e.target.value)}>{['breakfast','lunch','dinner','snack','meal'].map(x => <option key={x}>{x}</option>)}</select><button className="primary" disabled={!text.trim()} onClick={calculate}>Calculate meal</button></div>
    {items.length > 0 && <div className="editable-review"><h3>Review and correct</h3>
      <div className="librarysavechoice"><label>Save corrected items for<select value={visibility} onChange={e => setVisibility(e.target.value)}><option value="personal">Only me</option><option value="household">Whole family</option></select></label></div>
      {items.map((item, i) => <article key={`${item.id}-${i}`}>
        <div className="identityedit"><label>Restaurant or brand<input value={item.brand || ''} onChange={e => edit(i, 'brand', e.target.value)}/></label><label>Menu item<input value={item.name || ''} onChange={e => edit(i, 'name', e.target.value)}/></label><label>Serving description<input value={item.serving_label || ''} onChange={e => edit(i, 'serving_label', e.target.value)}/></label></div>
        {item.note && <em className="matchnote">{item.note}</em>}
        <div className="macroedit">{[['Servings','quantity','.25'],['Calories','calories','1'],['Protein (g)','protein_g','.1'],['Carbs (g)','carbs_g','.1'],['Fat (g)','fat_g','.1']].map(([label,key,step]) => <label key={key}>{label}<input type="number" min="0" step={step} value={item[key]} onChange={e => edit(i,key,e.target.value)}/></label>)}</div>
        <div className="reviewbuttons"><button className="saveverified" disabled={item.saved} onClick={() => saveToLibrary(item, i)}>{item.saved ? 'Saved to library' : 'Save verified item'}</button><button className="removefood" onClick={() => setItems(items.filter((_, n) => n !== i))}>Remove item</button></div>
      </article>)}
      <div className="phrasetotals"><strong>{Math.round(totals.calories)} cal</strong><span>{totals.protein_g.toFixed(1)}g protein</span><span>{totals.carbs_g.toFixed(1)}g carbs</span><span>{totals.fat_g.toFixed(1)}g fat</span></div>
      <button className="primary" onClick={log}>Log reviewed meal</button>
    </div>}
    {msg && <p className="message status">{msg}</p>}
    <small className="fatsecretcredit">Restaurant data provided by FatSecret. Official-menu and estimated values are labeled.</small>
  </section></div>
}
