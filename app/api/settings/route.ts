import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { getChatGPTUser } from '../../chatgpt-auth';

type MemberPatch = {
  memberId: string;
  displayName?: string;
  inviteEmail?: string | null;
  role?: 'adult' | 'teen';
  personalStartDate?: string;
  goalWeight?: number | null;
  stepGoal?: number;
  hydrationGoalOz?: number | null;
  sleepGoalMinutes?: number;
  movementMinutes?: number;
  scriptureMinutes?: number;
  remindersEnabled?: boolean;
  showWeightToHousehold?: boolean;
};

async function getOrCreateHousehold(userId: string, email: string) {
  const existing = await env.DB.prepare('SELECT id FROM households WHERE owner_user_id = ? LIMIT 1').bind(userId).first<{ id: string }>();
  if (existing) return existing.id;

  const membership = await env.DB.prepare('SELECT household_id AS id, auth_user_id AS authUserId FROM members WHERE auth_user_id = ? OR lower(invite_email) = lower(?) LIMIT 1').bind(userId, email).first<{ id: string; authUserId: string | null }>();
  if (membership) {
    if (!membership.authUserId) await env.DB.prepare('UPDATE members SET auth_user_id = ? WHERE household_id = ? AND lower(invite_email) = lower(?)').bind(userId, membership.id, email).run();
    return membership.id;
  }

  const now = Date.now();
  const householdId = crypto.randomUUID();
  const people = [
    { id: crypto.randomUUID(), name: 'Jay', role: 'adult', color: 'clay', auth: userId, steps: 8000, movement: 30, scripture: 30 },
    { id: crypto.randomUUID(), name: 'Kim', role: 'adult', color: 'sage', auth: null, steps: 7000, movement: 20, scripture: 20 },
    { id: crypto.randomUUID(), name: 'Son', role: 'teen', color: 'gold', auth: null, steps: 8000, movement: 30, scripture: 10 },
  ];

  const statements = [
    env.DB.prepare('INSERT INTO households (id, name, owner_user_id, created_at) VALUES (?, ?, ?, ?)').bind(householdId, 'Akins Family', userId, now),
    env.DB.prepare('INSERT INTO household_settings (id, household_id, program_name, weekly_review_day, family_quiet_hours_start, family_quiet_hours_end, shared_walk_enabled, encouragement_enabled, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), householdId, 'Faithful Together', 'Sunday', '21:00', '06:00', 1, 1, now),
    ...people.flatMap((person) => [
      env.DB.prepare('INSERT INTO members (id, household_id, auth_user_id, invite_email, display_name, role, color, private_health_data, created_at) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)').bind(person.id, householdId, person.auth, person.name, person.role, person.color, 1, now),
      env.DB.prepare('INSERT INTO member_settings (id, member_id, step_goal, sleep_goal_minutes, movement_minutes, scripture_minutes, reminders_enabled, show_weight_to_household, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), person.id, person.steps, 420, person.movement, person.scripture, 1, 0, now),
    ]),
  ];
  await env.DB.batch(statements);
  return householdId;
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const householdId = await getOrCreateHousehold(user.userId, user.email);
  const ownership = await env.DB.prepare('SELECT id FROM households WHERE id = ? AND owner_user_id = ?').bind(householdId, user.userId).first();
  const isAdmin = Boolean(ownership);

  const [household, globalSettings, members, substitutions, integrations] = await Promise.all([
    env.DB.prepare('SELECT id, name, journey_start_date AS journeyStartDate FROM households WHERE id = ?').bind(householdId).first(),
    env.DB.prepare('SELECT program_name AS programName, shared_start_date AS sharedStartDate, weekly_review_day AS weeklyReviewDay, family_quiet_hours_start AS quietStart, family_quiet_hours_end AS quietEnd, shared_walk_enabled AS sharedWalkEnabled, encouragement_enabled AS encouragementEnabled FROM household_settings WHERE household_id = ?').bind(householdId).first(),
    env.DB.prepare('SELECT m.id, m.display_name AS displayName, m.invite_email AS inviteEmail, m.role, m.color, (m.auth_user_id = ?) AS isCurrentUser, ms.personal_start_date AS personalStartDate, ms.goal_weight AS goalWeight, ms.step_goal AS stepGoal, ms.hydration_goal_oz AS hydrationGoalOz, ms.sleep_goal_minutes AS sleepGoalMinutes, ms.movement_minutes AS movementMinutes, ms.scripture_minutes AS scriptureMinutes, ms.reminders_enabled AS remindersEnabled, ms.show_weight_to_household AS showWeightToHousehold FROM members m JOIN member_settings ms ON ms.member_id = m.id WHERE m.household_id = ? AND (? = 1 OR m.auth_user_id = ?) ORDER BY m.created_at').bind(user.userId, householdId, isAdmin ? 1 : 0, user.userId).all(),
    env.DB.prepare('SELECT es.id, es.member_id AS memberId, es.original_exercise AS originalExercise, es.replacement_exercise AS replacementExercise, es.reason FROM exercise_substitutions es JOIN members m ON m.id = es.member_id WHERE m.household_id = ? AND es.active = 1').bind(householdId).all(),
    env.DB.prepare('SELECT id, kind, provider, status, display_label AS displayLabel FROM integrations WHERE household_id = ?').bind(householdId).all(),
  ]);

  return NextResponse.json({ household, globalSettings, members: members.results, substitutions: substitutions.results, integrations: integrations.results, isAdmin });
}

export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const householdId = await getOrCreateHousehold(user.userId, user.email);
  const ownership = await env.DB.prepare('SELECT id FROM households WHERE id = ? AND owner_user_id = ?').bind(householdId, user.userId).first();
  const isAdmin = Boolean(ownership);
  const body = await request.json() as { global?: Record<string, unknown>; member?: MemberPatch; exercise?: { memberId: string; original: string; replacement: string; reason?: string } };
  const now = Date.now();

  if (body.global) {
    if (!isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    const global = body.global;
    await env.DB.prepare('UPDATE household_settings SET program_name = ?, shared_start_date = ?, weekly_review_day = ?, family_quiet_hours_start = ?, family_quiet_hours_end = ?, shared_walk_enabled = ?, encouragement_enabled = ?, updated_at = ? WHERE household_id = ?').bind(
      String(global.programName ?? 'Faithful Together'), global.sharedStartDate || null, String(global.weeklyReviewDay ?? 'Sunday'), String(global.quietStart ?? '21:00'), String(global.quietEnd ?? '06:00'), global.sharedWalkEnabled ? 1 : 0, global.encouragementEnabled ? 1 : 0, now, householdId,
    ).run();
  }

  if (body.member) {
    const member = body.member;
    const owned = await env.DB.prepare('SELECT id, auth_user_id AS authUserId FROM members WHERE id = ? AND household_id = ?').bind(member.memberId, householdId).first<{ id: string; authUserId: string | null }>();
    if (!owned) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    if (!isAdmin && owned.authUserId !== user.userId) return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    if (member.displayName) await env.DB.prepare('UPDATE members SET display_name = ?, invite_email = COALESCE(?, invite_email), role = ? WHERE id = ?').bind(member.displayName, isAdmin ? (member.inviteEmail || null) : null, isAdmin ? (member.role ?? 'adult') : (await env.DB.prepare('SELECT role FROM members WHERE id = ?').bind(member.memberId).first<{ role: string }>())?.role ?? 'adult', member.memberId).run();
    await env.DB.prepare('UPDATE member_settings SET personal_start_date = ?, goal_weight = ?, step_goal = ?, hydration_goal_oz = ?, sleep_goal_minutes = ?, movement_minutes = ?, scripture_minutes = ?, reminders_enabled = ?, show_weight_to_household = ?, updated_at = ? WHERE member_id = ?').bind(
      member.personalStartDate || null, member.goalWeight ?? null, member.stepGoal ?? 7000, member.hydrationGoalOz ?? null, member.sleepGoalMinutes ?? 420, member.movementMinutes ?? 20, member.scriptureMinutes ?? 20, member.remindersEnabled ? 1 : 0, member.showWeightToHousehold ? 1 : 0, now, member.memberId,
    ).run();
  }

  if (body.exercise) {
    const exercise = body.exercise;
    const owned = await env.DB.prepare('SELECT id, auth_user_id AS authUserId FROM members WHERE id = ? AND household_id = ?').bind(exercise.memberId, householdId).first<{ id: string; authUserId: string | null }>();
    if (!owned) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    if (!isAdmin && owned.authUserId !== user.userId) return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    await env.DB.prepare('INSERT INTO exercise_substitutions (id, member_id, original_exercise, replacement_exercise, reason, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)').bind(crypto.randomUUID(), exercise.memberId, exercise.original, exercise.replacement, exercise.reason || null, now).run();
  }

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const householdId = await getOrCreateHousehold(user.userId, user.email);
  const ownership = await env.DB.prepare('SELECT id FROM households WHERE id = ? AND owner_user_id = ?').bind(householdId, user.userId).first();
  if (!ownership) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const body = await request.json() as { displayName?: string; inviteEmail?: string; role?: 'adult' | 'teen' };
  const displayName = body.displayName?.trim();
  if (!displayName) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const id = crypto.randomUUID();
  const now = Date.now();
  const role = body.role === 'adult' ? 'adult' : 'teen';
  const color = ['clay', 'sage', 'gold', 'blue'][Math.floor(Math.random() * 4)];
  await env.DB.batch([
    env.DB.prepare('INSERT INTO members (id, household_id, auth_user_id, invite_email, display_name, role, color, private_health_data, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?, 1, ?)').bind(id, householdId, body.inviteEmail?.trim() || null, displayName, role, color, now),
    env.DB.prepare('INSERT INTO member_settings (id, member_id, step_goal, sleep_goal_minutes, movement_minutes, scripture_minutes, reminders_enabled, show_weight_to_household, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?)').bind(crypto.randomUUID(), id, role === 'teen' ? 8000 : 7000, role === 'teen' ? 540 : 420, role === 'teen' ? 60 : 20, role === 'teen' ? 10 : 20, now),
  ]);
  return NextResponse.json({ id, displayName, inviteEmail: body.inviteEmail?.trim() || null, role, color }, { status: 201 });
}
