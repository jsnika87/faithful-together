import fs from 'node:fs';

function clean(s=''){return s.replace(/[■☐•]/g,'').replace(/\s+/g,' ').trim()}
function section(page,start,end){const a=page.indexOf(start);if(a<0)return'';const b=end.map(x=>page.indexOf(x,a+start.length)).filter(x=>x>a).sort((x,y)=>x-y)[0]??page.length;return page.slice(a+start.length,b)}
function firstTask(text){return clean(text.split('\n').find(x=>/[■☐]/.test(x))||'')}
function parse(path,kind){const pages=fs.readFileSync(path,'utf8').split('\f');return pages.map(page=>{const m=page.match(/DAY\s+(\d+)\s*\|/);if(!m)return null;const day=Number(m[1]);const header=(page.match(kind==='jay'?/WEEK\s+\d+:\s*([^|\n]+)/:/THEME:\s*([^|\n]+)/)||[])[1];const memory=(page.match(/MEMORY:\s*([^\n]+)/)||[])[1];const spirit=section(page,'SPIRIT',['BODY']);const body=section(page,'BODY',['NUTRITION']);const mind=section(page,kind==='jay'?'MIND / APOLOGETICS':'MIND / SERVANT LEADERSHIP',['MARRIAGE','EVENING REVIEW']);const together=kind==='jay'?firstTask(section(page,'MARRIAGE',['EVENING REVIEW'])):'Complete one concrete act of service or encouragement';return{day,theme:clean(header),memory:clean(memory),scripture:firstTask(spirit),body:firstTask(body),mind:firstTask(mind),together:clean(together)}}).filter(Boolean).sort((a,b)=>a.day-b.day)}
const jay=parse('/tmp/faithful-jay.txt','jay');
const kim=parse('/tmp/faithful-kim.txt','kim');
if(jay.length!==75||kim.length!==75)throw new Error(`Expected 75 days each; got Jay ${jay.length}, Kim ${kim.length}`);
const teen=kim.map(d=>({...d,body:d.day%3===1?'Age-appropriate full-body strength with good form':d.day%3===2?'Outdoor walk, mobility, or an active sport':'Fun conditioning, mobility, or family movement',mind:'Ten minutes of growth reading, school planning, or skill practice',together:'Encourage or help one family member today'}));
fs.writeFileSync(new URL('../static-app/src/programs.json',import.meta.url),JSON.stringify({jay,kim,teen},null,2)+'\n');
console.log(`Created ${jay.length+kim.length+teen.length} personalized day records.`);
