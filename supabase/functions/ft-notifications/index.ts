import webpush from 'npm:web-push@3.6.7';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
const url=Deno.env.get('SUPABASE_URL')!;
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const publicKey=Deno.env.get('FT_VAPID_PUBLIC_KEY')||'';
const privateKey=Deno.env.get('FT_VAPID_PRIVATE_KEY')||'';
const schedulerSecret=Deno.env.get('FT_NOTIFICATION_SCHEDULER_SECRET')||'';
const appUrl=(Deno.env.get('APP_URL')||'https://faithful.104.236.27.61.nip.io').replace(/\/$/,'');
const sb=createClient(url,serviceKey);

if(publicKey&&privateKey)webpush.setVapidDetails('mailto:admin@akinsos.us',publicKey,privateKey);

async function send(subscription:any,payload:any){
  try{await webpush.sendNotification({endpoint:subscription.endpoint,keys:{p256dh:subscription.p256dh,auth:subscription.auth_key}},JSON.stringify(payload));return true}
  catch(error:any){if(error?.statusCode===404||error?.statusCode===410)await sb.from('ft_push_subscriptions').delete().eq('id',subscription.id);return false}
}

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  const body=await req.json().catch(()=>({}));
  if(body.action==='dispatch'){
    if(!schedulerSecret||req.headers.get('x-ft-scheduler-secret')!==schedulerSecret)return json({error:'Not authorized'},401);
    const{data:prefs}=await sb.from('ft_notification_preferences').select('*');
    let sent=0;
    for(const pref of prefs||[]){
      let local:any;
      try{local=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:pref.timezone,weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]))}catch{continue}
      const now=`${local.hour}:${local.minute}`;const today=`${local.year}-${local.month}-${local.day}`;const weekday=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(local.weekday);
      const due=(enabled:boolean,time:string,last:string|null)=>enabled&&time.slice(0,5)===now&&(!last||!last.startsWith(today));
      let kind='';let title='';let message='';let stamp='';
      if(due(pref.checkin_enabled,pref.checkin_time,pref.last_checkin_sent_at)){kind='checkin';title='Finish today faithfully';message='Take a minute for your evening check-in.';stamp='last_checkin_sent_at'}
      else if(due(pref.workout_enabled,pref.workout_time,pref.last_workout_sent_at)){kind='workout';title='Your next right step';message='Your workout is ready when you are.';stamp='last_workout_sent_at'}
      else if(pref.weekly_review_day===weekday&&due(pref.weekly_review_enabled,pref.weekly_review_time,pref.last_weekly_review_sent_at)){kind='weekly';title='Look back, then move forward';message='Your weekly review is ready.';stamp='last_weekly_review_sent_at'}
      if(!kind&&pref.smart_nudges_enabled&&(pref.smart_nudges_sent_on!==today||Number(pref.smart_nudges_sent_count||0)<2)){
        const smartCount=pref.smart_nudges_sent_on===today?Number(pref.smart_nudges_sent_count||0):0;
        const{data:settings}=await sb.from('ft_member_settings').select('hydration_goal_oz,step_goal').eq('household_id',pref.household_id).eq('user_id',pref.user_id).single();
        if(pref.hydration_nudge_time?.slice(0,5)===now){const{data:water}=await sb.from('ft_water_logs').select('ounces').eq('household_id',pref.household_id).eq('user_id',pref.user_id).eq('logged_on',today);const total=(water||[]).reduce((sum:number,item:any)=>sum+Number(item.ounces||0),0),goal=Number(settings?.hydration_goal_oz||64);if(total<goal*.5){kind='smart';title='Hydration is behind pace';message=`You are at ${total} of ${goal} oz. A glass now gets the day moving again.`}}
        if(!kind&&pref.movement_nudge_time?.slice(0,5)===now){const{data:checks}=await sb.from('ft_daily_checkins').select('steps,updated_at').eq('household_id',pref.household_id).eq('user_id',pref.user_id).order('updated_at',{ascending:false}).limit(1);const check=checks?.[0],checkDay=check?Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:pref.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(check.updated_at)).filter(x=>x.type!=='literal').map(x=>[x.type,x.value])):null,steps=checkDay&&`${checkDay.year}-${checkDay.month}-${checkDay.day}`===today?Number(check.steps||0):0,goal=Number(settings?.step_goal||7000);if(steps<goal*.6){kind='smart';title='A short walk would change the day';message=`You have ${steps.toLocaleString()} steps. Ten focused minutes is a faithful next move.`}}
        if(!kind&&pref.faithful_nudge_time?.slice(0,5)===now){const{data:checks}=await sb.from('ft_daily_checkins').select('completed_actions,updated_at').eq('household_id',pref.household_id).eq('user_id',pref.user_id).order('updated_at',{ascending:false}).limit(1);const check=checks?.[0],checkDay=check?Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:pref.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(check.updated_at)).filter(x=>x.type!=='literal').map(x=>[x.type,x.value])):null,done=checkDay&&`${checkDay.year}-${checkDay.month}-${checkDay.day}`===today?(check.completed_actions||[]).length:0;if(done<5){kind='smart';title='Finish one faithful step';message=`${5-done} steps remain. Choose one meaningful finish; the day does not need perfection.`}}
        if(kind==='smart')pref.smart_nudges_sent_count=smartCount+1;
      }
      if(!kind)continue;
      const{data:subs}=await sb.from('ft_push_subscriptions').select('*').eq('household_id',pref.household_id).eq('user_id',pref.user_id);
      for(const sub of subs||[])if(await send(sub,{title,body:message,url:kind==='weekly'?`${appUrl}/?view=progress`:appUrl}))sent++;
      const update=kind==='smart'?{smart_nudges_sent_on:today,smart_nudges_sent_count:pref.smart_nudges_sent_count,updated_at:new Date().toISOString()}:{[stamp]:today,updated_at:new Date().toISOString()};
      await sb.from('ft_notification_preferences').update(update).eq('household_id',pref.household_id).eq('user_id',pref.user_id);
    }
    return json({ok:true,sent});
  }
  const jwt=(req.headers.get('Authorization')||'').replace('Bearer ','');
  const{data:{user}}=await sb.auth.getUser(jwt);if(!user)return json({error:'Sign in required'},401);
  if(!publicKey||!privateKey)return json({error:'Notifications are not configured yet'},503);
  if(body.action==='public_key')return json({public_key:publicKey});
  if(body.action==='encouragement'){
    const allowed=['Way to stay faithful!','Proud of your progress!','Keep taking the next right step!','We are in this together!'];
    if(!allowed.includes(body.message))return json({error:'Choose one of the available encouragements'},400);
    const{data:sender}=await sb.from('ft_household_members').select('household_id').eq('user_id',user.id).limit(1).single();
    const{data:recipient}=await sb.from('ft_household_members').select('household_id').eq('user_id',body.to_user_id).eq('household_id',sender?.household_id||'00000000-0000-0000-0000-000000000000').maybeSingle();
    if(!sender||!recipient||body.to_user_id===user.id)return json({error:'Family member not found'},403);
    const{error:postError}=await sb.from('ft_family_encouragements').insert({household_id:sender.household_id,from_user_id:user.id,to_user_id:body.to_user_id,message:body.message});
    if(postError)return json({error:postError.message},400);
    const{data:profile}=await sb.from('ft_profiles').select('display_name').eq('id',user.id).single();
    const{data:subs}=await sb.from('ft_push_subscriptions').select('*').eq('household_id',sender.household_id).eq('user_id',body.to_user_id);
    let sent=0;for(const sub of subs||[])if(await send(sub,{title:`${profile?.display_name||'Your family'} encouraged you`,body:body.message,url:`${appUrl}/?view=family`}))sent++;
    return json({ok:true,posted:true,notified:sent>0,sent});
  }
  if(body.action==='test'){
    const{data:subs}=await sb.from('ft_push_subscriptions').select('*').eq('user_id',user.id);
    if(!subs?.length)return json({error:'Enable notifications on this device first'},400);
    let sent=0;for(const sub of subs)if(await send(sub,{title:'Faithful Together',body:'Reminders are working on this device.',url:appUrl}))sent++;
    return sent?json({ok:true,sent}):json({error:'The test could not be delivered'},502);
  }
  return json({error:'Unknown action'},400);
});
