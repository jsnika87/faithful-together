export const workoutPlans={
  jay:{
    'Strength A':{title:'Strength A - Lower + Push',note:'Rest 60-90 seconds. Keep every repetition clean.',moves:[['Sandbag bear-hug squat','4 x 8-12'],['35-lb kettlebell Romanian deadlift','4 x 10-15'],['Elevated push-up','4 x 6-15'],['TRX-assisted reverse lunge','3 x 8/leg'],['Dumbbell floor press','3 x 12-15'],['35-lb suitcase carry','3 x 30-45 sec/side'],['Dead bug','3 x 8-10/side']]},
    'Strength B':{title:'Strength B - Pull + Hinge',note:'Rest 60-90 seconds. Keep every repetition clean.',moves:[['Sandbag deadlift','4 x 8-12'],['TRX row','4 x 8-15'],['One-arm 35-lb kettlebell row','3 x 8-12/side'],['Glute bridge','3 x 12-20'],['TRX face pull','3 x 12-15'],['Dumbbell curl','3 x 12-15'],['Bird dog','3 x 8/side']]},
    'Strength C':{title:'Strength C - Full Body',note:'Move deliberately and stop before form breaks down.',moves:[['Sandbag bear-hug squat','4 x 10'],['TRX row','4 x 10-15'],['35-lb kettlebell Romanian deadlift','3 x 12'],['Elevated push-up','3 x 8-15'],['TRX split squat','3 x 8/leg'],['One-arm kettlebell row','3 x 10/side'],['Suitcase carry','4 x 30 sec'],['Dead bug','3 x 10/side']]},
    'Strength D':{title:'Strength D - Work Capacity',note:'Complete 3-4 controlled rounds, then 15-20 minutes of moderate walking.',moves:[['Sandbag deadlift','10'],['Bear-hug carry','30-45 sec'],['TRX row','12'],['Goblet squat','10'],['Elevated push-up','8-12'],['Suitcase carry','30 sec/side']]},
    'Conditioning':{title:'Conditioning',note:'Complete five rounds, then 15-20 minutes of easy walking.',moves:[['Brisk walk','1 min'],['Kettlebell deadlift','10'],['TRX row','10'],['Chair squat','10'],['Elevated push-up','8'],['Easy walk','1 min']]},
    'Recovery':{title:'Recovery + Mobility',note:'Use a pain-free range. Recovery is training, not failure.',moves:[['Easy walking','20+ min'],['Chin tuck','8 slow reps'],['Doorway pec stretch','30 sec/side'],['Wall slide','8-10'],['Open-book rotation','8/side'],['Cat-cow','8 slow reps'],['Hip-flexor stretch','45 sec/side'],['Glute bridge','12']]}
  },
  kim:{
    'Strength A':{title:'Full-body Strength A',note:'RPE 5-6/10. Finish with 3-4 good repetitions still available.',moves:[['Chair or goblet squat','2 x 8-10'],['Dumbbell Romanian deadlift','2 x 8-10'],['Dumbbell chest or floor press','2 x 8-10'],['One-arm dumbbell row','2 x 10/side'],['Supported step-up','2 x 8/side'],['Band pull-apart','2 x 10-12']]},
    'Strength B':{title:'Full-body Strength B',note:'Breathe continuously. Stop movements that cause pelvic pressure or pain.',moves:[['Sit-to-stand','2 x 10'],['Elevated dumbbell deadlift','2 x 8-10'],['Incline or wall push-up','2 x 8-12'],['Band row','2 x 10-12'],['Supported reverse lunge or step-back tap','2 x 6-8/side'],['Farmer carry','2 x 20-30 sec']]},
    'Walking':{title:'Walking + Mobility',note:'Outdoor movement when practical and safe.',moves:[['Easy walk','20-45 min by program phase'],['Shoulder rolls','8'],['Gentle hip hinges','8'],['Sit-to-stands','8'],['Wall push-ups','8'],['Easy marching','30 sec']]}
  },
  teen:{
    'Strength':{title:'Teen Full-body Strength',note:'Use light resistance, excellent form, and adult guidance when needed. No max-effort lifting.',moves:[['Bodyweight squat','2-3 x 8-12'],['Hip hinge with light load','2-3 x 8-12'],['Incline push-up','2-3 x 6-12'],['Band or TRX row','2-3 x 8-12'],['Step-up','2 x 8/side'],['Farmer carry','2 x 20 sec'],['Front plank','2 x 15-30 sec']]},
    'Active':{title:'Active Day',note:'Choose something enjoyable. The goal is consistent movement, skill, and confidence.',moves:[['Walk, bike, sport, or active play','30-60 min'],['Gentle mobility','5-10 min'],['Optional family walk','Easy conversational pace']]},
    'Recovery':{title:'Teen Recovery',note:'Sleep, hydration, and recovery support growth.',moves:[['Easy walk','15-30 min'],['Gentle full-body mobility','5-10 min'],['Prepare for 8-10 hours sleep','Nightly']]}
  }
};

export function workoutFor(track,body=''){
  const library=workoutPlans[track]||workoutPlans.jay;
  const key=Object.keys(library).find(k=>body.toLowerCase().includes(k.toLowerCase()));
  if(key)return library[key];
  if(track==='teen')return body.toLowerCase().includes('recovery')?library.Recovery:body.toLowerCase().includes('strength')?library.Strength:library.Active;
  if(track==='kim')return body.toLowerCase().includes('strength a')?library['Strength A']:body.toLowerCase().includes('strength b')?library['Strength B']:library.Walking;
  return library.Recovery;
}
