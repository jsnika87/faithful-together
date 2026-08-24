import{createClient}from'https://esm.sh/@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-ft-sync-key'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
const hex=(bytes:Uint8Array)=>[...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
async function hash(value:string){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))))}
function dateKey(value:Date){return`${value.getUTCFullYear()}-${String(value.getUTCMonth()+1).padStart(2,'0')}-${String(value.getUTCDate()).padStart(2,'0')}`}

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const body=await req.json().catch(()=>({}));
  if(body.action==='import'){
    const token=(req.headers.get('x-ft-sync-key')||'').trim();
    if(!token)return json({error:'Connection code required'},401);
    const{data:key}=await sb.from('ft_health_import_tokens').select('*').eq('token_hash',await hash(token)).eq('active',true).maybeSingle();
    if(!key)return json({error:'Connection code is invalid or revoked'},401);
    const steps=Math.round(Number(body.steps)),loggedOn=String(body.date||dateKey(new Date()));
    if(!Number.isFinite(steps)||steps<0||steps>100000||!/^\d{4}-\d{2}-\d{2}$/.test(loggedOn))return json({error:'Valid steps and date required'},400);
    const[{data:settings},{data:existing}]=await Promise.all([
      sb.from('ft_member_settings').select('personal_start_date,program_cycle').eq('household_id',key.household_id).eq('user_id',key.user_id).single(),
      sb.from('ft_daily_checkins').select('*').eq('household_id',key.household_id).eq('user_id',key.user_id).order('program_cycle',{ascending:false})
    ]);
    const start=settings?.personal_start_date?new Date(`${settings.personal_start_date}T00:00:00Z`):new Date(`${loggedOn}T00:00:00Z`),target=new Date(`${loggedOn}T00:00:00Z`);
    const programDay=Math.max(1,Math.min(75,Math.floor((target.getTime()-start.getTime())/86400000)+1)),cycle=settings?.program_cycle||1;
    const current=(existing||[]).find((x:any)=>x.program_cycle===cycle&&x.program_day===programDay)||{};
    const row={...current,household_id:key.household_id,user_id:key.user_id,program_cycle:cycle,program_day:programDay,steps,steps_source:'apple_health',steps_synced_at:new Date().toISOString(),updated_at:new Date().toISOString()};
    delete row.created_at;
    const{error}=await sb.from('ft_daily_checkins').upsert(row,{onConflict:'household_id,user_id,program_cycle,program_day'});
    if(error)return json({error:error.message},400);
    await sb.from('ft_health_import_tokens').update({last_used_at:new Date().toISOString()}).eq('id',key.id);
    return json({saved:true,steps,date:loggedOn,program_day:programDay});
  }
  const jwt=(req.headers.get('Authorization')||'').replace('Bearer ','');
  const{data:{user}}=await sb.auth.getUser(jwt);if(!user)return json({error:'Sign in required'},401);
  const{data:member}=await sb.from('ft_household_members').select('household_id').eq('user_id',user.id).limit(1).single();if(!member)return json({error:'Household required'},403);
  if(body.action==='status'){const{data:key}=await sb.from('ft_health_import_tokens').select('created_at,last_used_at').eq('user_id',user.id).eq('active',true).maybeSingle();return json({connected:!!key,created_at:key?.created_at||null,last_used_at:key?.last_used_at||null})}
  if(body.action==='create'){await sb.from('ft_health_import_tokens').update({active:false}).eq('user_id',user.id).eq('active',true);const raw=crypto.getRandomValues(new Uint8Array(32));const token=btoa(String.fromCharCode(...raw)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');const{error}=await sb.from('ft_health_import_tokens').insert({household_id:member.household_id,user_id:user.id,token_hash:await hash(token)});if(error)return json({error:error.message},400);return json({connected:true,connection_code:token,import_url:`${Deno.env.get('SUPABASE_URL')}/functions/v1/ft-health-steps`})}
  if(body.action==='revoke'){await sb.from('ft_health_import_tokens').update({active:false}).eq('user_id',user.id).eq('active',true);return json({connected:false})}
  return json({error:'Unknown action'},400);
});
