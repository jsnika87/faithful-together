'use client';

import { useEffect, useState } from 'react';

type PersonalSettings = {
  id: string; displayName: string; role: 'adult' | 'teen'; color: string; personalStartDate: string | null;
  goalWeight: number | null; stepGoal: number; hydrationGoalOz: number | null; sleepGoalMinutes: number;
  movementMinutes: number; scriptureMinutes: number; remindersEnabled: number | boolean; showWeightToHousehold: number | boolean;
};

const fallback: PersonalSettings = { id: 'preview', displayName: 'My', role: 'adult', color: 'clay', personalStartDate: null, goalWeight: null, stepGoal: 7000, hydrationGoalOz: 64, sleepGoalMinutes: 420, movementMinutes: 20, scriptureMinutes: 20, remindersEnabled: true, showWeightToHousehold: false };

export default function PersonalSettingsPage() {
  const [profile, setProfile] = useState(fallback);
  const [status, setStatus] = useState('');
  useEffect(() => { fetch('/api/settings').then((r) => r.ok ? r.json() : null).then((data) => { const mine = data?.members?.find((member: PersonalSettings & { isCurrentUser?: number }) => member.isCurrentUser) ?? data?.members?.[0]; if (mine) setProfile(mine); }).catch(() => undefined); }, []);
  const update = (key: keyof PersonalSettings, value: string | number | boolean | null) => setProfile((current) => ({ ...current, [key]: value }));
  const save = async () => { const response = await fetch('/api/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ member: profile }) }); setStatus(response.ok ? 'Your settings are saved.' : 'Sign in to save your settings.'); };

  return <main className="personal-settings-page">
    <header><a className="brand" href="/"><span className="brand-mark">FT</span><span><strong>Faithful</strong><em>Together</em></span></a><a href="/">← Today</a></header>
    <section className="personal-settings-wrap">
      <div className="personal-intro"><span className={`avatar xl ${profile.color}`}>{profile.displayName[0]}</span><div><span>MY SETTINGS</span><h1>{profile.displayName === 'My' ? 'My personal journey' : `${profile.displayName}’s personal journey`}</h1><p>The family shares a direction. Your pace, goals, limits, and health details remain your own.</p></div></div>
      <div className="personal-settings-grid">
        <section className="settings-card"><h3>My timeline</h3><div className="field-grid"><label>Start date<input type="date" value={profile.personalStartDate ?? ''} onChange={(e) => update('personalStartDate', e.target.value)} /></label>{profile.role === 'adult' && <label>Goal weight (lb)<input type="number" value={profile.goalWeight ?? ''} placeholder="Optional" onChange={(e) => update('goalWeight', e.target.value ? Number(e.target.value) : null)} /></label>}</div></section>
        <section className="settings-card"><h3>My daily targets</h3><div className="target-grid"><label><span>Steps</span><input type="number" value={profile.stepGoal} onChange={(e) => update('stepGoal', Number(e.target.value))} /><small>per day</small></label><label><span>Movement</span><input type="number" value={profile.movementMinutes} onChange={(e) => update('movementMinutes', Number(e.target.value))} /><small>minutes</small></label><label><span>Scripture</span><input type="number" value={profile.scriptureMinutes} onChange={(e) => update('scriptureMinutes', Number(e.target.value))} /><small>minutes</small></label><label><span>Sleep</span><input type="number" value={Math.round(profile.sleepGoalMinutes / 60)} onChange={(e) => update('sleepGoalMinutes', Number(e.target.value) * 60)} /><small>hours</small></label></div></section>
        <section className="settings-card"><h3>Privacy & support</h3><label className="switch-row"><span><strong>Personal reminders</strong><small>Gentle prompts based on my schedule</small></span><input type="checkbox" checked={Boolean(profile.remindersEnabled)} onChange={(e) => update('remindersEnabled', e.target.checked)} /></label><label className="switch-row"><span><strong>Share weight with household</strong><small>Off by default; completion never depends on it</small></span><input type="checkbox" checked={Boolean(profile.showWeightToHousehold)} onChange={(e) => update('showWeightToHousehold', e.target.checked)} /></label></section>
        <section className="settings-card"><div className="exercise-head"><div><h3>My exercise substitutions</h3><p>Swap movements around injuries, equipment, preference, or medical guidance.</p></div><button type="button">+ Add</button></div><div className="empty-exercise"><span>↔</span><p>Your changes will follow you without changing anyone else’s workout.</p></div></section>
      </div>
      <div className="save-bar"><p>{status || 'Only you and the family admin can change these settings.'}</p><button onClick={save}>Save my settings</button></div>
    </section>
  </main>;
}
