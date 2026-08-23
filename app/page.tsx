'use client';

import { useState } from 'react';

const family = [
  { name: 'Jay', initial: 'J', status: 'Ready', color: 'clay' },
  { name: 'Kim', initial: 'K', status: 'Checked in', color: 'sage' },
  { name: 'Son', initial: 'S', status: '3 of 5', color: 'gold' },
];

const commitments = [
  { area: 'Faith', title: 'Steward what God entrusted to you', detail: 'Read Romans 12:1-2 · Prayer · Practice this week’s passage', time: '20 min', icon: '✦', tone: 'violet' },
  { area: 'Body', title: 'Strength A + an easy outdoor walk', detail: 'Warm up, train with clean reps, then walk 1.5 miles', time: '45 min', icon: '↑', tone: 'green' },
  { area: 'Stewardship', title: 'Fuel, hydrate, and track honestly', detail: 'Follow your clinician-guided targets · Notice energy and symptoms', time: 'All day', icon: '◒', tone: 'amber' },
  { area: 'Character', title: 'Choose the hard right thing first', detail: 'God before recreational phone · No short-form feeds today', time: 'Today', icon: '◇', tone: 'blue' },
  { area: 'Together', title: 'Take a family walk after dinner', detail: 'Ten unhurried minutes. Each person shares one gratitude.', time: '10 min', icon: '♥', tone: 'rose' },
];

export default function Home() {
  const [capacity, setCapacity] = useState<'green' | 'yellow' | 'red'>('green');
  const [done, setDone] = useState<number[]>([0]);

  const toggle = (index: number) => {
    setDone((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index]);
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="Faithful Together home">
          <span className="brand-mark">FT</span>
          <span><strong>Faithful</strong><em>Together</em></span>
        </a>
        <nav className="nav" aria-label="Primary navigation">
          <a className="active" href="#today"><span>⌂</span>Today</a>
          <a href="#journey"><span>◎</span>Journey</a>
          <a href="#family"><span>♧</span>Family</a>
          <a href="#reflections"><span>▤</span>Reflections</a>
        </nav>
        <div className="journey-mini">
          <div className="mini-heading"><span>75-day journey</span><b>24%</b></div>
          <div className="progress"><i style={{ width: '24%' }} /></div>
          <p>Day 18 of 75</p><small>Week 3 · Self-Control</small>
        </div>
        <button className="profile-button">
          <span className="avatar clay">J</span><span><strong>Jay</strong><small>Personal journey</small></span><b>•••</b>
        </button>
      </aside>

      <section className="main-panel" id="top">
        <header className="topbar">
          <div className="mobile-brand">FT</div>
          <div className="date-lockup"><span>Sunday</span><strong>August 23</strong></div>
          <div className="top-actions">
            <button aria-label="Notifications">○</button>
            <div className="family-faces" aria-label="Family members">
              {family.map((person) => <span key={person.name} className={`avatar ${person.color}`}>{person.initial}</span>)}
            </div>
          </div>
        </header>

        <div className="content" id="today">
          <section className="hero">
            <div><p className="eyebrow">DAY 18 · SELF-CONTROL</p><h1>Good morning, Jay.</h1><p>Faithfulness today does not require perfection.<br />It requires your next right step.</p></div>
            <div className="verse"><span>THIS WEEK’S MEMORY</span><blockquote>“But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, self-control...”</blockquote><cite>Galatians 5:22-23 · NASB 2020</cite></div>
          </section>

          <section className="capacity-card">
            <div><span className="section-kicker">CHECK IN</span><h2>What kind of day is today?</h2><p>Your plan adapts to your real capacity. Choosing honestly is part of the discipline.</p></div>
            <div className="capacity-options">
              {([['green', 'Green', 'Full plan'], ['yellow', 'Yellow', 'Lower intensity'], ['red', 'Red', 'Recovery is the work']] as const).map(([value, label, hint]) => (
                <button key={value} onClick={() => setCapacity(value)} className={capacity === value ? `selected ${value}` : value}><i /><span><strong>{label}</strong><small>{hint}</small></span></button>
              ))}
            </div>
          </section>

          <div className="today-heading"><div><span className="section-kicker">YOUR RULE FOR TODAY</span><h2>Five faithful steps</h2></div><span className="completion">{done.length} of {commitments.length} complete</span></div>
          <section className="commitment-list">
            {commitments.map((item, index) => (
              <button key={item.area} className={`commitment ${done.includes(index) ? 'complete' : ''}`} onClick={() => toggle(index)}>
                <span className={`commitment-icon ${item.tone}`}>{item.icon}</span><span className="commitment-copy"><small>{item.area}</small><strong>{item.title}</strong><em>{item.detail}</em></span><span className="duration">{item.time}</span><span className="check">✓</span>
              </button>
            ))}
          </section>
        </div>
      </section>

      <aside className="family-rail" id="family">
        <div className="rail-header"><div><span className="section-kicker">YOUR HOUSEHOLD</span><h2>Walking together</h2></div><button>+</button></div>
        <div className="family-list">
          {family.map((person, index) => <div className="family-row" key={person.name}><span className={`avatar large ${person.color}`}>{person.initial}</span><span><strong>{person.name}</strong><small>{index === 0 ? 'Your journey' : person.status}</small></span><i className={index === 1 ? 'checked' : ''}>{index === 1 ? '✓' : '→'}</i></div>)}
        </div>
        <div className="together-card"><span>TOGETHER TODAY</span><div className="walk-art"><i>☼</i><b>♧</b><b>♧</b><em>· · ·</em></div><h3>Walk & gratitude</h3><p>Take ten minutes after dinner. Everyone shares one thing they’re grateful for.</p><div><span className="avatar clay">J</span><span className="avatar sage">K</span><span className="avatar gold">S</span></div></div>
        <div className="grace-note"><span>✦</span><div><strong>The family rule</strong><p>No punishment. No compensation. No restarting. We simply return.</p></div></div>
      </aside>

      <nav className="mobile-nav"><a className="active" href="#today">⌂<span>Today</span></a><a href="#journey">◎<span>Journey</span></a><a href="#family">♧<span>Family</span></a><a href="#reflections">▤<span>Reflect</span></a></nav>
    </main>
  );
}
