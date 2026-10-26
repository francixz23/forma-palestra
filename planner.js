// Generazione schede e progressione deterministica. Nessun servizio o AI esterna.
export const FOCUSES = {
  ipertrofia: { title: 'Massa muscolare', subtitle: 'Ipertrofia e progressione graduale' },
  forza: { title: 'Forza', subtitle: 'Movimenti fondamentali e recupero' },
  ricomposizione: { title: 'Ricomposizione', subtitle: 'Allenamento completo e costante' },
  benessere: { title: 'Forma generale', subtitle: 'Movimento, tecnica e continuità' },
};

export const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
export const DAY_POSITIONS = {
  1: [1], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5],
  5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6],
};

const INITIAL_EXERCISES = [
  ['squat','Squat con bilanciere','Gambe','base'],
  ['goblet','Goblet squat','Gambe','base'],
  ['pressa','Leg press','Gambe','base'],
  ['stacco-rumeno','Stacco rumeno','Gambe','base'],
  ['affondi','Affondi con manubri','Gambe','base'],
  ['leg-curl','Leg curl','Gambe','accessorio'],
  ['leg-extension','Leg extension','Gambe','accessorio'],
  ['calf','Calf raise','Gambe','accessorio'],
  ['panca','Panca piana','Petto','base'],
  ['panca-inclinata','Panca inclinata manubri','Petto','base'],
  ['chest-press','Chest press','Petto','base'],
  ['croci','Croci ai cavi','Petto','accessorio'],
  ['lat','Lat machine','Schiena','base'],
  ['trazioni','Trazioni assistite','Schiena','base'],
  ['rematore','Rematore con manubrio','Schiena','base'],
  ['pulley','Pulley basso','Schiena','base'],
  ['pullover','Pullover ai cavi','Schiena','accessorio'],
  ['military','Shoulder press','Spalle','base'],
  ['alzate','Alzate laterali','Spalle','accessorio'],
  ['reverse-fly','Reverse fly','Spalle','accessorio'],
  ['curl','Curl con manubri','Bicipiti','accessorio'],
  ['curl-bil','Curl con bilanciere EZ','Bicipiti','accessorio'],
  ['pushdown','Pushdown tricipiti','Tricipiti','accessorio'],
  ['french','French press','Tricipiti','accessorio'],
  ['plank','Plank','Core','accessorio','secondi'],
  ['crunch','Crunch ai cavi','Core','accessorio'],
  ['dead-bug','Dead bug','Core','accessorio'],
];

export function defaultExercises() {
  return INITIAL_EXERCISES.map(([id,name,muscle,kind,unit]) => ({ id,name,muscle,kind,unit:unit||'ripetizioni' }));
}

const SPLITS = {
  1: [
    ['Full body', ['goblet','panca','lat','stacco-rumeno','plank']],
  ],
  2: [
    ['Full body A', ['squat','panca','rematore','alzate','plank']],
    ['Full body B', ['stacco-rumeno','lat','panca-inclinata','pressa','curl']],
  ],
  3: [
    ['Full body A', ['goblet','panca','lat','alzate','plank']],
    ['Full body B', ['stacco-rumeno','military','pulley','leg-curl','pushdown']],
    ['Full body C', ['pressa','panca-inclinata','rematore','affondi','curl']],
  ],
  4: [
    ['Upper A', ['panca','lat','military','rematore','pushdown']],
    ['Lower A', ['squat','stacco-rumeno','leg-curl','calf','plank']],
    ['Upper B', ['panca-inclinata','pulley','alzate','curl','croci']],
    ['Lower B', ['pressa','affondi','leg-extension','leg-curl','crunch']],
  ],
  5: [
    ['Push', ['panca','panca-inclinata','military','alzate','pushdown']],
    ['Pull', ['lat','rematore','pulley','reverse-fly','curl']],
    ['Legs', ['squat','stacco-rumeno','leg-curl','calf','plank']],
    ['Upper', ['chest-press','trazioni','panca-inclinata','pulley','french']],
    ['Lower', ['pressa','affondi','leg-extension','leg-curl','crunch']],
  ],
  6: [
    ['Push A', ['panca','panca-inclinata','military','alzate','pushdown']],
    ['Pull A', ['lat','rematore','pullover','reverse-fly','curl']],
    ['Legs A', ['squat','stacco-rumeno','leg-curl','calf','plank']],
    ['Push B', ['chest-press','panca-inclinata','military','croci','french']],
    ['Pull B', ['trazioni','pulley','rematore','reverse-fly','curl-bil']],
    ['Legs B', ['pressa','affondi','leg-extension','leg-curl','crunch']],
  ],
};

function uniqueId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
export { uniqueId };

export function dateISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
export function dateFromISO(text) {
  const [y,m,d] = String(text).split('-').map(Number);
  return new Date(y,m-1,d,12,0,0);
}
export function mondayISO(now = new Date()) {
  const d = new Date(now.getFullYear(),now.getMonth(),now.getDate(),12);
  d.setDate(d.getDate() - ((d.getDay()+6)%7));
  return dateISO(d);
}
export function nextWeekISO(start) {
  const d = dateFromISO(start);
  d.setDate(d.getDate()+7);
  return dateISO(d);
}
export function weekEndISO(start) {
  const d = dateFromISO(start);
  d.setDate(d.getDate()+6);
  return dateISO(d);
}
export function dateLabel(iso, options={day:'numeric',month:'short'}) {
  return new Intl.DateTimeFormat('it-IT',options).format(dateFromISO(iso));
}
export function weekLabel(start) {
  return `${dateLabel(start)} – ${dateLabel(weekEndISO(start))}`;
}

export function suggestedTargets(focus,kind,unit='ripetizioni') {
  if(unit==='secondi')return {sets:3,min:30,max:45};
  if (focus === 'forza') return kind==='base' ? {sets:4,min:4,max:6} : {sets:3,min:8,max:10};
  if (focus === 'ipertrofia') return kind==='base' ? {sets:3,min:8,max:12} : {sets:3,min:10,max:15};
  if (focus === 'ricomposizione') return {sets:3,min:10,max:12};
  return kind==='base' ? {sets:3,min:10,max:15} : {sets:2,min:12,max:15};
}
export function makeLog(sets,targetWeight=0) {
  return Array.from({length:sets},() => ({done:false,weight:Number(targetWeight)||0,reps:null,rir:null}));
}
export function makeExercise(exercise,focus,settings={}) {
  const tgt = suggestedTargets(focus,exercise.kind,exercise.unit);
  const sets = Number(settings.sets ?? tgt.sets);
  const min = Number(settings.min ?? tgt.min);
  const max = Number(settings.max ?? tgt.max);
  const weight = Number(settings.weight ?? 0);
  return {id:uniqueId(),exerciseId:exercise.id,name:exercise.name,muscle:exercise.muscle,
    kind:exercise.kind,unit:exercise.unit||'ripetizioni',setsTarget:sets,repMin:min,repMax:max,targetWeight:weight,
    logs:makeLog(sets,weight),note:'',insight:''};
}

export function buildWeek(profile,exercises,weekStart=mondayISO()) {
  const positions = DAY_POSITIONS[profile.days] || DAY_POSITIONS[3];
  const split = SPLITS[profile.days] || SPLITS[3];
  const index = new Map(exercises.map(e=>[e.id,e]));
  return {id:uniqueId(),start:weekStart,focus:profile.focus,createdAt:new Date().toISOString(),
    days:split.map(([title, ids],i) => ({id:uniqueId(),title,dayOfWeek:positions[i],completedAt:null,
      exercises:ids.map(id=>makeExercise(index.get(id),profile.focus))}))};
}

export function completedSetCount(day) {
  return day.exercises.reduce((n,e)=>n+e.logs.filter(s=>s.done).length,0);
}
export function plannedSetCount(day) {
  return day.exercises.reduce((n,e)=>n+e.setsTarget,0);
}
export function isDayComplete(day) { return Boolean(day.completedAt); }
export function weekCompletion(week) {
  const completed=week.days.filter(isDayComplete).length;
  return {completed,total:week.days.length,ratio:week.days.length?completed/week.days.length:0};
}

function median(values) {
  const arr=[...values].sort((a,b)=>a-b);
  return arr[Math.floor(arr.length/2)];
}
function numberRound(value,step=0.5) { return Math.round(value/step)*step; }
function weightText(value) {return `${Number(value).toLocaleString('it-IT',{maximumFractionDigits:1})} kg`;}

// Segue la singola performance registrata, non stima la forza massimale.
// RIR e andamento delle ultime sedute: regole conservative, mai una prescrizione.
export function progression(previous, next, recent=[], options={}) {
  const done=(previous?.logs||[]).filter(s=>s.done && Number(s.reps)>0);
  const measured=done.map(s=>Number(s.weight)).filter(w=>Number.isFinite(w)&&w>0);
  const base=measured.length ? median(measured) : Number(previous?.targetWeight||next.targetWeight||0);
  const enough=done.length >= Number(previous?.setsTarget ?? next.setsTarget);
  const top=enough && done.every(s=>Number(s.reps)>=Number(previous.repMax));
  const below=enough && done.filter(s=>Number(s.reps)<Number(previous.repMin)).length>=2;
  const knownRir=done.filter(s=>s.rir!==null && s.rir!==undefined && s.rir!=='' && Number.isInteger(Number(s.rir)));
  const maxEffort=knownRir.some(s=>Number(s.rir)<=1);
  const recoveryMargin=knownRir.length===done.length && done.length>0 && knownRir.every(s=>Number(s.rir)>=2);
  const increment=base<20?1:2.5;
  let change=top && recoveryMargin && !options.stale && base>0 ? increment : (below && base>0 && !options.stale ? -increment : 0);
  let weight=Math.max(0,numberRound(base+change,0.5));
  let setsTarget=next.setsTarget;
  let insight='Nessuna registrazione: mantieni il carico obiettivo.';
  if(options.stale && done.length) {
    insight=`Ultima prestazione non recente: riparti da ${weightText(base)} senza aumento automatico.`;
    weight=base;
  } else if(done.length>0 && !enough) {
    insight='Seduta parziale: mantieni il carico e completa progressivamente le serie.';
  } else if(top && recoveryMargin && base>0) {
    insight=`Range alto completato con RIR ≥2: prova ${weightText(weight)} (+${weightText(increment)}) se tecnica e recupero sono buoni.`;
  } else if(top && base===0) {
    insight='Range alto raggiunto: valuta più ripetizioni o resistenza, se appropriate.';
  } else if(below && base>0) {
    insight=`Ripetizioni sotto l’obiettivo: valuta ${weightText(weight)} e tecnica controllata.`;
  } else if(done.length && maxEffort) {
    insight='RIR molto basso: mantieni il carico e cura il recupero.';
  } else if(top && knownRir.length<done.length) {
    insight='Range alto raggiunto, ma RIR non completo: tieni il carico e registra il margine prima di aumentare.';
  } else if(done.length) {
    insight='Consolida la progressione: completa più ripetizioni nel range con tecnica stabile.';
  }
  // Proposta di scarico SOLO dopo tre sedute consecutive con RIR = 0 registrato.
  // Non vengono create riduzioni per un singolo giorno difficile.
  const previousThree=recent.slice(-3);
  const persistentExhaustion=previousThree.length===3 && previousThree.every(ex=>{
    const logs=(ex.logs||[]).filter(s=>s.done && Number(s.reps)>0);
    return logs.length>0 && logs.some(s=>s.rir!==null && Number(s.rir)===0);
  });
  if(persistentExhaustion && base>0 && !options.stale){
    weight=numberRound(base*0.9,0.5);
    setsTarget=Math.max(1,next.setsTarget-1);
    insight=`Tre sedute con RIR 0: scarico suggerito (${weightText(weight)}, ${setsTarget} serie). Modifica la proposta se necessario.`;
  }
  return {...next,setsTarget,targetWeight:weight,logs:makeLog(setsTarget,weight),insight};
}

export function createNextWeek(previousWeek,profile,exercises,historyWeeks=[]) {
  const start=nextWeekISO(previousWeek.start);
  const base=previousWeek.days.length===profile.days
    ? {id:uniqueId(),start,focus:profile.focus,createdAt:new Date().toISOString(),
       days:previousWeek.days.map(day => ({id:uniqueId(),title:day.title,dayOfWeek:day.dayOfWeek,completedAt:null,
        exercises:day.exercises.map(ex=>({...ex,id:uniqueId(),logs:makeLog(ex.setsTarget,ex.targetWeight),insight:''}))}))}
    : buildWeek(profile,exercises,start);
  if(previousWeek.focus && previousWeek.focus !== profile.focus && previousWeek.days.length===profile.days){
    for(const day of base.days){
      day.exercises=day.exercises.map(ex=>{
        const old=suggestedTargets(previousWeek.focus,ex.kind,ex.unit);
        if(ex.setsTarget!==old.sets || ex.repMin!==old.min || ex.repMax!==old.max)return ex;
        const next=suggestedTargets(profile.focus,ex.kind,ex.unit);
        return {...ex,setsTarget:next.sets,repMin:next.min,repMax:next.max,logs:makeLog(next.sets,ex.targetWeight)};
      });
    }
  }
  const sources=(historyWeeks.length?historyWeeks:[previousWeek]).filter(w=>w.start<=previousWeek.start)
    .slice().sort((a,b)=>a.start.localeCompare(b.start));
  const allExercises=sources.flatMap(w=>w.days.flatMap(day=>day.exercises.map(ex=>({ex,weekStart:w.start}))));
  for(let i=0;i<base.days.length;i++) {
    base.days[i].exercises=base.days[i].exercises.map(ex=>{
      const recent=allExercises.filter(item=>item.ex.exerciseId===ex.exerciseId && item.ex.logs.some(s=>s.done));
      const same=previousWeek.days[i]?.exercises.find(old=>old.exerciseId===ex.exerciseId);
      const mostRecent=recent.at(-1);
      const source=(same?.logs.some(s=>s.done)?same:mostRecent?.ex)||same;
      return progression(source,ex,recent.map(x=>x.ex),{stale:Boolean(mostRecent && mostRecent.weekStart<previousWeek.start)});
    });
  }
  return base;
}
