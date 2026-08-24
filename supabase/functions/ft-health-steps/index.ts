import{createClient}from'https://esm.sh/@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-ft-sync-key'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
const hex=(bytes:Uint8Array)=>[...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
async function hash(value:string){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))))}
function dateKey(value:Date){return`${value.getUTCFullYear()}-${String(value.getUTCMonth()+1).padStart(2,'0')}-${String(value.getUTCDate()).padStart(2,'0')}`}
type StepSample={source?:unknown,start?:unknown,end?:unknown,steps?:unknown,value?:unknown,id?:unknown};
function mergeSamples(input:unknown){
  if(typeof input==='string'){try{input=JSON.parse(input)}catch{throw new Error('The Health sample list was not valid JSON')}}
  if(!Array.isArray(input)||!input.length||input.length>5000)throw new Error('Provide between 1 and 5,000 Health samples');
  const bucketMs=5*60*1000,buckets=new Map<number,{watch:number,phone:number}>(),seen=new Set<string>();
  let watchSteps=0,phoneSteps=0,accepted=0;
  for(const raw of input as StepSample[]){
    const label=String(raw.source||'').toLowerCase();
    const source=label.includes('watch')?'watch':label.includes('iphone')||label.includes('phone')?'phone':null;
    const steps=Number(raw.steps??raw.value),start=new Date(String(raw.start)).getTime();
    let end=new Date(String(raw.end??raw.start)).getTime();
    if(!source||!Number.isFinite(steps)||steps<0||steps>10000||!Number.isFinite(start))continue;
    if(!Number.isFinite(end)||end<=start)end=start+1;if(end-start>6*60*60*1000)continue;
    const signature=String(raw.id||`${source}|${start}|${end}|${steps}`);if(seen.has(signature))continue;seen.add(signature);
    source==='watch'?watchSteps+=steps:phoneSteps+=steps;accepted++;
    const first=Math.floor(start/bucketMs),last=Math.floor((end-1)/bucketMs),duration=end-start;
    for(let b=first;b<=last;b++){const overlap=Math.max(0,Math.min(end,(b+1)*bucketMs)-Math.max(start,b*bucketMs));const row=buckets.get(b)||{watch:0,phone:0};row[source]+=steps*(overlap/duration);buckets.set(b,row)}
  }
  if(!accepted)throw new Error('No Apple Watch or iPhone step samples were recognized');
  let merged=0,overlap=0;for(const row of buckets.values()){merged+=Math.max(row.watch,row.phone);if(row.watch>0&&row.phone>0)overlap++}
  return{steps:Math.round(merged),watch_steps:Math.round(watchSteps),phone_steps:Math.round(phoneSteps),overlap_buckets:overlap,sample_count:accepted,bucket_minutes:5};
}

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const body=await req.json().catch(()=>({}));
  if(body.action==='import'){
    const token=(req.headers.get('x-ft-sync-key')||'').trim();
    if(!token)return json({error:'Connection code required'},401);
    const steps=Math.round(Number(body.steps)),loggedOn=String(body.date||dateKey(new Date()));
    if(!Number.isFinite(steps)||steps<0||steps>100000||!/^\d{4}-\d{2}-\d{2}$/.test(loggedOn))return json({error:'Valid steps and date required'},400);
    const{data,error}=await sb.rpc('ft_import_health_steps',{supplied_token_hash:await hash(token),supplied_steps:steps,supplied_date:loggedOn});
    if(error)return json({error:error.message},error.message.includes('invalid or revoked')?401:400);
    return json(data);
  }
  if(body.action==='merge'){
    const token=(req.headers.get('x-ft-sync-key')||'').trim();if(!token)return json({error:'Connection code required'},401);
    const loggedOn=String(body.date||dateKey(new Date()));if(!/^\d{4}-\d{2}-\d{2}$/.test(loggedOn))return json({error:'Valid date required'},400);
    try{const merged=mergeSamples(body.samples);const{data,error}=await sb.rpc('ft_import_merged_health_steps',{supplied_token_hash:await hash(token),supplied_steps:merged.steps,supplied_watch_steps:merged.watch_steps,supplied_phone_steps:merged.phone_steps,supplied_overlap_buckets:merged.overlap_buckets,supplied_date:loggedOn});if(error)return json({error:error.message},error.message.includes('invalid or revoked')?401:400);return json({...data,sample_count:merged.sample_count,bucket_minutes:merged.bucket_minutes})}catch(error){return json({error:error instanceof Error?error.message:'Health samples could not be merged'},400)}
  }
  const jwt=(req.headers.get('Authorization')||'').replace('Bearer ','');
  const{data:{user}}=await sb.auth.getUser(jwt);if(!user)return json({error:'Sign in required'},401);
  const{data:member}=await sb.from('ft_household_members').select('household_id').eq('user_id',user.id).limit(1).single();if(!member)return json({error:'Household required'},403);
  if(body.action==='status'){const[{data:key},{data:last}]=await Promise.all([sb.from('ft_health_import_tokens').select('created_at,last_used_at').eq('user_id',user.id).eq('active',true).maybeSingle(),sb.from('ft_daily_checkins').select('steps,steps_source,steps_watch,steps_phone,steps_overlap_buckets,steps_synced_at').eq('user_id',user.id).order('steps_synced_at',{ascending:false,nullsFirst:false}).limit(1).maybeSingle()]);return json({connected:!!key,created_at:key?.created_at||null,last_used_at:key?.last_used_at||null,last_merge:last?.steps_source==='apple_health_merge'?last:null})}
  if(body.action==='create'){await sb.from('ft_health_import_tokens').update({active:false}).eq('user_id',user.id).eq('active',true);const raw=crypto.getRandomValues(new Uint8Array(32));const token=btoa(String.fromCharCode(...raw)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');const{error}=await sb.from('ft_health_import_tokens').insert({household_id:member.household_id,user_id:user.id,token_hash:await hash(token)});if(error)return json({error:error.message},400);return json({connected:true,connection_code:token,import_url:`${Deno.env.get('SUPABASE_URL')}/functions/v1/ft-health-steps`})}
  if(body.action==='revoke'){await sb.from('ft_health_import_tokens').update({active:false}).eq('user_id',user.id).eq('active',true);return json({connected:false})}
  return json({error:'Unknown action'},400);
});
