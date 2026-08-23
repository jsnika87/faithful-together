'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Member = {
  id: string; displayName: string; role: 'adult' | 'teen'; color: string;
  inviteEmail?: string | null;
  personalStartDate: string | null; goalWeight: number | null; stepGoal: number;
  hydrationGoalOz: number | null; sleepGoalMinutes: number; movementMinutes: number;
  scriptureMinutes: number; remindersEnabled: number | boolean; showWeightToHousehold: number | boolean;
};

const fallbackMembers: Member[] = [
  { id: 'jay', displayName: 'Jay', inviteEmail: null, role: 'adult', color: 'clay', personalStartDate: null, goalWeight: 195, stepGoal: 8000, hydrationGoalOz: 80, sleepGoalMinutes: 420, movementMinutes: 30, scriptureMinutes: 30, remindersEnabled: true, showWeightToHousehold: false },
  { id: 'kim', displayName: 'Kim', inviteEmail: null, role: 'adult', color: 'sage', personalStartDate: null, goalWeight: null, stepGoal: 7000, hydrationGoalOz: 64, sleepGoalMinutes: 420, movementMinutes: 20, scriptureMinutes: 20, remindersEnabled: true, showWeightToHousehold: false },
  { id: 'son', displayName: 'Son', inviteEmail: null, role: 'teen', color: 'gold', personalStartDate: null, goalWeight: null, stepGoal: 8000, hydrationGoalOz: null, sleepGoalMinutes: 540, movementMinutes: 60, scriptureMinutes: 10, remindersEnabled: true, showWeightToHousehold: false },
];

const integrations = [
  { kind: 'Calendar', icon: '□', description: 'See family events beside routines and workouts', status: 'Next' },
  { kind: 'Smart Home', icon: '⌂', description: 'Scenes, lights, locks, climate, and household status', status: 'Planned' },
  { kind: 'Wearables', icon: '◉', description: 'Bring steps, sleep, workouts, and recovery together', status: 'Planned' },
  { kind: 'Tasks', icon: '✓', description: 'Personal priorities, chores, and family responsibilities', status: 'Planned' },
];

export default function AdminPage() {
  const [tab, setTab] = useState<'household' | 'people' | 'integrations'>('household');
  const [members, setMembers] = useState(fallbackMembers);
  const [selectedId, setSelectedId] = useState('jay');
  const [saved, setSaved] = useState('');
  const [global, setGlobal] = useState({ programName: 'Faithful Together', sharedStartDate: '', weeklyReviewDay: 'Sunday', quietStart: '21:00', quietEnd: '06:00', sharedWalkEnabled: true, encouragementEnabled: true });
  const selected = useMemo(() => members.find((member) => member.id === selectedId) ?? members[0], [members, selectedId]);

  useEffect(() => {
    fetch('/api/settings').then((response) => response.ok ? response.json() : null).then((data) => {
      if (!data) return;
      if (data.members?.length) { setMembers(data.members); setSelectedId(data.members[0].id); }
      if (data.globalSettings) setGlobal((current) => ({ ...current, ...data.globalSettings, sharedWalkEnabled: Boolean(data.globalSettings.sharedWalkEnabled), encouragementEnabled: Boolean(data.globalSettings.encouragementEnabled) }));
    }).catch(() => undefined);
  }, []);

  const flash = (message: string) => { setSaved(message); window.setTimeout(() => setSaved(''), 2400); };
  const saveGlobal = async () => {
    const response = await fetch('/api/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ global }) });
    flash(response.ok ? 'Household settings saved' : 'Preview updated — sign in to save');
  };
  const updateMember = (key: keyof Member, value: string | number | boolean | null) => setMembers((current) => current.map((member) => member.id === selected.id ? { ...member, [key]: value } : member));
  const saveMember = async () => {
    const response = await fetch('/api/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ member: selected }) });
    flash(response.ok ? `${selected.displayName}’s settings saved` : 'Preview updated — sign in to save');
  };

  return (
    <main className="admin-shell">
      <aside className="admin-side">
        <Link className="brand" href="/"><span className="brand-mark">FT</span><span><strong>Faithful</strong><em>Together</em></span></Link>
        <div className="admin-label">FAMILY ADMIN</div>
        <nav>
          <button className={tab === 'household' ? 'active' : ''} onClick={() => setTab('household')}><span>⌂</span>Household</button>
          <button className={tab === 'people' ? 'active' : ''} onClick={() => setTab('people')}><span>♧</span>People & goals</button>
          <button className={tab === 'integrations' ? 'active' : ''} onClick={() => setTab('integrations')}><span>⌁</span>Connections</button>
        </nav>
        <div className="admin-note"><span>✦</span><p><strong>Admin principle</strong>Set the family rhythm here. Each person still owns their private goals, reflections, and capacity.</p></div>
        <Link className="back-link" href="/">← Back to Today</Link>
      </aside>

      <section className="admin-main">
        <header className="admin-top"><div><span>SETTINGS</span><h1>{tab === 'household' ? 'Household rhythm' : tab === 'people' ? 'Personal journeys' : 'Your life, connected'}</h1></div><span className="admin-badge">Admin · Jay</span></header>
        {saved && <div className="save-toast">✓ {saved}</div>}

        {tab === 'household' && <div className="settings-grid">
          <section className="settings-card wide"><div className="card-title"><span className="settings-icon green">⌂</span><div><h2>Shared journey</h2><p>The common structure everyone experiences together.</p></div></div>
            <div className="field-grid"><label>Program name<input value={global.programName} onChange={(e) => setGlobal({ ...global, programName: e.target.value })} /></label><label>Shared start date<input type="date" value={global.sharedStartDate ?? ''} onChange={(e) => setGlobal({ ...global, sharedStartDate: e.target.value })} /></label><label>Weekly family review<select value={global.weeklyReviewDay} onChange={(e) => setGlobal({ ...global, weeklyReviewDay: e.target.value })}>{['Sunday','Monday','Friday','Saturday'].map((day) => <option key={day}>{day}</option>)}</select></label></div>
          </section>
          <section className="settings-card"><div className="card-title"><span className="settings-icon amber">☼</span><div><h2>Family culture</h2><p>Gentle guardrails for your home.</p></div></div>
            <label className="switch-row"><span><strong>Shared daily action</strong><small>One thing the family does together</small></span><input type="checkbox" checked={global.sharedWalkEnabled} onChange={(e) => setGlobal({ ...global, sharedWalkEnabled: e.target.checked })} /></label>
            <label className="switch-row"><span><strong>Encouragements</strong><small>Allow simple support, never scores</small></span><input type="checkbox" checked={global.encouragementEnabled} onChange={(e) => setGlobal({ ...global, encouragementEnabled: e.target.checked })} /></label>
          </section>
          <section className="settings-card"><div className="card-title"><span className="settings-icon violet">◐</span><div><h2>Quiet hours</h2><p>Protect sleep, prayer, and presence.</p></div></div>
            <div className="time-grid"><label>Begin<input type="time" value={global.quietStart} onChange={(e) => setGlobal({ ...global, quietStart: e.target.value })} /></label><label>End<input type="time" value={global.quietEnd} onChange={(e) => setGlobal({ ...global, quietEnd: e.target.value })} /></label></div>
          </section>
          <div className="save-bar"><p>Changes apply to the family framework, not private personal targets.</p><button onClick={saveGlobal}>Save household settings</button></div>
        </div>}

        {tab === 'people' && <div className="people-layout">
          <aside className="member-picker"><span>FAMILY MEMBERS</span>{members.map((member) => <button className={member.id === selected.id ? 'active' : ''} key={member.id} onClick={() => setSelectedId(member.id)}><span className={`avatar large ${member.color}`}>{member.displayName[0]}</span><span><strong>{member.displayName}</strong><small>{member.role === 'teen' ? 'Teen journey' : 'Adult journey'}</small></span><b>›</b></button>)}</aside>
          <section className="personal-panel"><div className="personal-heading"><div><span className={`avatar xl ${selected.color}`}>{selected.displayName[0]}</span><div><span>PERSONAL SETTINGS</span><h2>{selected.displayName}’s journey</h2></div></div><span className="privacy-pill">Private by default</span></div>
            <div className="settings-card flat"><h3>Schedule & direction</h3><div className="field-grid three"><label>Display name<input value={selected.displayName} onChange={(e) => updateMember('displayName', e.target.value)} /></label><label>Personal start date<input type="date" value={selected.personalStartDate ?? ''} onChange={(e) => updateMember('personalStartDate', e.target.value)} /></label>{selected.role === 'adult' ? <label>Goal weight (lb)<input type="number" value={selected.goalWeight ?? ''} placeholder="Optional" onChange={(e) => updateMember('goalWeight', e.target.value ? Number(e.target.value) : null)} /></label> : <div className="teen-guardrail"><strong>Teen-safe profile</strong><small>No weight target. Focus stays on strength, energy, sleep, and character.</small></div>}<label>Account email<input type="email" value={selected.inviteEmail ?? ''} placeholder="Used to open their private profile" onChange={(e) => updateMember('inviteEmail', e.target.value)} /></label></div></div>
            <div className="settings-card flat"><h3>Daily targets</h3><div className="target-grid"><label><span>Steps</span><input type="number" value={selected.stepGoal} onChange={(e) => updateMember('stepGoal', Number(e.target.value))} /><small>per day</small></label><label><span>Movement</span><input type="number" value={selected.movementMinutes} onChange={(e) => updateMember('movementMinutes', Number(e.target.value))} /><small>minutes</small></label><label><span>Scripture</span><input type="number" value={selected.scriptureMinutes} onChange={(e) => updateMember('scriptureMinutes', Number(e.target.value))} /><small>minutes</small></label><label><span>Sleep</span><input type="number" value={Math.round(selected.sleepGoalMinutes / 60)} onChange={(e) => updateMember('sleepGoalMinutes', Number(e.target.value) * 60)} /><small>hours</small></label></div></div>
            <div className="settings-card flat"><div className="exercise-head"><div><h3>Exercise changes</h3><p>Personal substitutions automatically follow this person through the program.</p></div><button onClick={() => flash('Exercise editor is next in the build')}>+ Add substitution</button></div><div className="empty-exercise"><span>↔</span><p>No substitutions yet. Replace any movement with a safer or preferred option.</p></div></div>
            <div className="save-bar personal"><label className="mini-switch"><input type="checkbox" checked={Boolean(selected.remindersEnabled)} onChange={(e) => updateMember('remindersEnabled', e.target.checked)} /> Personal reminders</label><button onClick={saveMember}>Save {selected.displayName}’s settings</button></div>
          </section>
        </div>}

        {tab === 'integrations' && <div className="connections-view"><div className="future-banner"><div><span>THE NORTH STAR</span><h2>One calm place to run your life.</h2><p>Your calendar, home, health, faith, tasks, and family rhythm should meet here—without turning your day into a wall of data.</p></div><div className="orb">FT</div></div><div className="integration-grid">{integrations.map((item) => <article key={item.kind}><span className="integration-icon">{item.icon}</span><div><span>{item.status}</span><h3>{item.kind}</h3><p>{item.description}</p></div><button disabled={item.status !== 'Next'}>{item.status === 'Next' ? 'Plan connection' : 'Coming later'}</button></article>)}</div><div className="assistant-roadmap"><h3>How the personal assistant grows</h3><ol><li><b>Now</b><span>Wellness, spiritual formation, household settings, personal goals</span></li><li><b>Next</b><span>Unified calendar, daily agenda, routines, reminders, meal and workout planning</span></li><li><b>Then</b><span>Smart-home scenes, wearable data, tasks, notes, and proactive weekly planning</span></li><li><b>Later</b><span>A conversational assistant that can act—with explicit permission—across each module</span></li></ol></div></div>}
      </section>
    </main>
  );
}
