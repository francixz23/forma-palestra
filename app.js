import { loadState, saveState, eraseState } from './db.js';
import {
  FOCUSES, WEEKDAYS, defaultExercises, uniqueId, dateISO, dateFromISO,
  mondayISO, weekLabel, dateLabel, buildWeek, createNextWeek,
  completedSetCount, plannedSetCount, weekCompletion, makeExercise,
} from './planner.js';
import {plusDays, plannedDate, sessionEntries, rescheduleBounds, canMoveSession,
  suggestMissedReschedules, exerciseSessions, exerciseTrend, personalRecords,
  lastExerciseSession, restDuration} from './features.js';
import {MUSCLES,getExerciseGuide,alternativeExercises} from './catalog.js';
import {createAiReport,validateAiProposal,applyAiChanges} from './ai_bridge.js';

const root=document.getElementById('app');
const dialog=document.getElementById('app-dialog');
const toastEl=document.getElementById('toast');
const backupInput=document.getElementById('backup-file');
let state=null;
let view='home';
let selectedWeekStart=null;
let activeWorkoutId=null;
let pendingSave=Promise.resolve();
let toastTimer=null;
let libraryTerm='';
let libraryMuscle='Tutti';
let trendExerciseId=null;
let trendMetric='maxWeight';
let timerAlertedEnd=null;
let audioContext=null;
let aiReportWeeks=4;
let aiIncludeWeight=false;
let aiIncludeNotes=false;
let aiTextDraft='';
let pendingAiProposal=null;
let aiSelectedKeys=new Set();
const nfmt=new Intl.NumberFormat('it-IT',{maximumFractionDigits:1});

const ICONS={
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  chart:'<path d="M4 19V5M4 19h16M8 15l4-5 3 2 5-6"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2 2-.06-.06A1.65 1.65 0 0 0 15.9 19l-.1.02V22h-3v-.1a1.65 1.65 0 0 0-1.02-1.53l-.12-.05a1.65 1.65 0 0 0-1.82.33l-.06.06-2-2 .06-.06A1.65 1.65 0 0 0 8.17 17l-.05-.12A1.65 1.65 0 0 0 6.6 15.9H6.5v-3h.1a1.65 1.65 0 0 0 1.53-1.02l.04-.12a1.65 1.65 0 0 0-.33-1.82l-.06-.06 2-2 .06.06A1.65 1.65 0 0 0 11.67 8l.12-.05A1.65 1.65 0 0 0 12.8 6.4V6.3h3v.1a1.65 1.65 0 0 0 1.02 1.53l.12.05a1.65 1.65 0 0 0 1.82-.33l.06-.06 2 2-.06.06a1.65 1.65 0 0 0-.33 1.82l.05.12a1.65 1.65 0 0 0 1.52 1.01h.1v3h-.1a1.65 1.65 0 0 0-1.53 1.02z" transform="translate(-2.2 -2.2) scale(1.05)"/>',
  dumbbell:'<path d="m6.5 6.5 11 11M4 8l4-4M3 11l8-8M16 20l4-4M13 21l8-8"/>',
  arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
  back:'<path d="M19 12H5m6-6-6 6 6 6"/>',
  chev:'<path d="m9 18 6-6-6-6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  edit:'<path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4z"/>',
  trash:'<path d="M3 6h18m-2 0-1 15H6L5 6m3 0V4h8v2m-6 4v8m4-8v8"/>',
  down:'<path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4"/>',
  up:'<path d="M12 21V9m-5 5 5-5 5 5M5 7V3h14v4"/>',
  lock:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  offline:'<path d="M3 3l18 18M2 9a16 16 0 0 1 6-2m8 0a16 16 0 0 1 6 2M5 13c2-2 5-3 8-3m5 3 .5.5M9 17a4 4 0 0 1 6 0M12 21h.01"/>',
  sparkle:'<path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7zM5 19l.6 1.4L7 21l-1.4.6L5 23l-.6-1.4L3 21l1.4-.6z"/>',
  bolt:'<path d="m13 2-9 12h7l-1 8 10-12h-7z"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  weight:'<path d="M6 7h12l3 13H3L6 7z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5 9a8 8 0 0 1 14-2l1 1M4 16l1 1a8 8 0 0 0 14-2"/>',
  award:'<circle cx="12" cy="8" r="5"/><path d="M8 12 6 22l6-3 6 3-2-10"/>',
  book:'<path d="M12 7v14m0-14C9 5 6 4 3 5v15c3-1 6 0 9 2m0-15c3-2 6-3 9-2v15c-3-1-6 0-9 2"/>',
  pause:'<path d="M7 5v14M17 5v14"/>',
  play:'<path d="m8 5 12 7-12 7z"/>',
  repeat:'<path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/>',
};
function icon(name,size=20){return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]||ICONS.info}</svg>`;}
function html(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function pretty(value){return nfmt.format(Number(value)||0);}
function dayLabel(day){return WEEKDAYS[day.dayOfWeek]||'Giorno';}
function isoForDay(week,day){return plannedDate(week,day);}
function todayLabel(){return new Intl.DateTimeFormat('it-IT',{weekday:'long',day:'numeric',month:'long'}).format(new Date());}
function isWeekFuture(week){return week.start>mondayISO();}
function latestWeek(){return state?.weeks[state.weeks.length-1]||null;}
function getWeek(){return state.weeks.find(w=>w.start===selectedWeekStart)||latestWeek();}
function activeCalendarWeek(){
  const current=mondayISO();
  return state.weeks.find(w=>w.start===current) || [...state.weeks].filter(w=>w.start<=current).at(-1) || state.weeks[0];
}
function workoutById(id){for(const week of state.weeks){const day=week.days.find(d=>d.id===id);if(day)return {week,day};}return null;}
function exerciseById(day,id){return day.exercises.find(e=>e.id===id);}
function inform(message){toastEl.textContent=message;toastEl.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.remove('show'),3500);}
function persist(){
  const snapshot=structuredClone(state);
  pendingSave=pendingSave.catch(()=>{}).then(()=>saveState(snapshot));
  pendingSave.catch(error=>{console.error(error);inform('Errore nel salvataggio. Crea un backup e controlla lo spazio disponibile.');});
  return pendingSave;
}
function go(next){view=next;render();window.scrollTo({top:0,behavior:'instant'});}
function setWorkout(id){activeWorkoutId=id;go('workout');}
function htmlField(title,name,value,options={}){
  return `<div class="field"><label for="${html(name)}">${html(title)}</label><input id="${html(name)}" name="${html(name)}" type="${options.type||'text'}" value="${html(value??'')}" ${options.placeholder?`placeholder="${html(options.placeholder)}"`:''} ${options.min!==undefined?`min="${options.min}"`:''} ${options.max!==undefined?`max="${options.max}"`:''} ${options.step?`step="${options.step}"`:''} ${options.required===false?'':'required'} ${options.auto?'autocomplete="given-name"':'autocomplete="off"'}></div>`;
}
function focusChoices(value){return `<div class="focus-select">${Object.entries(FOCUSES).map(([key,focus])=>`<div><input id="focus-${key}" type="radio" name="focus" value="${key}" ${key===value?'checked':''}><label for="focus-${key}"><strong>${html(focus.title)}</strong><span>${html(focus.subtitle)}</span></label></div>`).join('')}</div>`;}
function dayChoices(value){return `<div class="days-select">${[1,2,3,4,5,6].map(n=>`<div><input type="radio" name="days" value="${n}" id="day-count-${n}" ${Number(value)===n?'checked':''}><label for="day-count-${n}">${n}</label></div>`).join('')}</div>`;}
function navItem(name,label,symbol){const on=view===name||(['workout','calendar','library'].includes(view)&&name==='plan');return `<button class="nav-item ${on?'active':''}" type="button" data-action="nav" data-target="${name}" aria-current="${on?'page':'false'}">${icon(symbol)}<span>${label}</span></button>`;}
function shell(content){
  return `<div class="shell"><header class="topbar"><div class="brand"><span class="brand-icon">F</span><div>FORMA<div class="brand-caption">GYM JOURNAL</div></div></div><div class="status"><span class="dot"></span>DATI LOCALI</div></header><main class="main">${content}</main></div><div class="nav-wrap"><nav class="bottom-nav" aria-label="Menu principale">${navItem('home','Home','home')}${navItem('plan','Scheda','calendar')}${navItem('ai','Coach','sparkle')}${navItem('progress','Progressi','chart')}${navItem('settings','Profilo','settings')}</nav></div>`;
}
function render(){
  if(!state){root.innerHTML=renderOnboarding();return;}
  const page= view==='plan'?renderPlan():view==='workout'?renderWorkout():view==='calendar'?renderCalendar():view==='library'?renderLibrary():view==='ai'?renderAiBridge():view==='progress'?renderProgress():view==='settings'?renderSettings():renderHome();
  root.innerHTML=shell(page);
}
function renderOnboarding(){
  return `<div class="onboarding"><div class="brand"><span class="brand-icon">F</span> FORMA</div>
    <div class="onboarding-hero"><span class="eyebrow">IL TUO DIARIO, LE TUE REGOLE</span><h1>Più costanza.<br><em>Meno caos.</em></h1>
    <p>Allenamenti, carichi e progressi in un unico posto. Nessun account per FORMA: i tuoi dati restano sul telefono. Il coach ChatGPT è facoltativo e si usa copiando un report.</p>
    <div class="onboarding-badges"><span class="chip">${icon('lock',14)} Solo locale</span><span class="chip">${icon('offline',14)} Offline</span><span class="chip">${icon('sparkle',14)} Coach Go facoltativo</span></div></div>
    <form class="onboarding-form" data-form="setup">
      <div class="form-section"><h2 class="form-section-heading">01 / Chi sei</h2><div class="form-grid">${htmlField('Nome','firstName','',{placeholder:'Mario',auto:true})}${htmlField('Cognome','lastName','',{placeholder:'Rossi'})}</div><div style="margin-top:11px">${htmlField('Peso attuale (kg)','weight','',{type:'number',min:20,max:400,step:'0.1',placeholder:'75'})}</div></div>
      <div class="form-section"><h2 class="form-section-heading">02 / Quanti giorni ti alleni?</h2>${dayChoices(3)}<p class="field-hint">Da 1 a 6 giorni a settimana. Potrai cambiare la frequenza in seguito.</p></div>
      <div class="form-section"><h2 class="form-section-heading">03 / Qual è il tuo focus?</h2>${focusChoices('ipertrofia')}</div>
      <button type="submit" class="btn full arrow">Crea la mia prima scheda ${icon('arrow',20)}</button>
      <p class="footer-caption">La prima scheda è un punto di partenza modificabile, non una prescrizione medica o un piano personalizzato da un allenatore.</p>
    </form></div>`;
}
function renderHome(){
  const w=activeCalendarWeek();
  const s=weekCompletion(w);
  const doneSets=w.days.reduce((n,d)=>n+completedSetCount(d),0);
  const next=w.days.filter(d=>!d.completedAt).sort((a,b)=>isoForDay(w,a).localeCompare(isoForDay(w,b)))[0]||w.days[0];
  const date=isoForDay(w,next);
  const lastWeight=state.weightHistory.at(-1)?.kg ?? state.profile.weight;
  return `<section class="section"><div class="eyebrow">${html(todayLabel())}</div><h1 class="h1">Ciao, ${html(state.profile.firstName)}. <span style="color:var(--accent)">Si cresce.</span></h1>
    <p class="body mt-0">Ogni allenamento conta. Tieni traccia dei risultati e costruisci il prossimo passo.</p></section>
    <section class="section"><div class="hero"><div class="row between" style="margin-bottom:17px"><span class="chip accent">${icon('calendar',14)} SETTIMANA ATTIVA</span><span class="small" style="color:#d4edc0;font-weight:790">${s.completed}/${s.total} completati</span></div>
    <h2 class="h2">${html(weekLabel(w.start))}</h2><p class="small" style="color:#bacbb8;line-height:1.5;margin:9px 0 22px">${s.completed===s.total?'Tutte le sessioni completate. Ottimo lavoro!':'Segna le serie durante l’allenamento per aggiornare automaticamente la prossima scheda.'}</p>
    <div class="progress-track"><span style="width:${Math.round(s.ratio*100)}%"></span></div><div class="row between" style="margin-top:9px"><span class="mini muted">Progressi settimanali</span><span class="small semibold">${Math.round(s.ratio*100)}%</span></div></div></section>
    <section class="section"><div class="metric-grid"><div class="metric"><strong>${s.total}</strong><span>Giorni previsti</span></div><div class="metric"><strong>${doneSets}</strong><span>Serie registrate</span></div><div class="metric"><strong>${pretty(lastWeight)}<small style="font-size:12px;font-weight:600"> kg</small></strong><span>Peso attuale</span></div></div></section>
    <section class="section"><div class="section-head"><div><h2 class="h2">${s.completed===s.total?'Ultimo allenamento':'Prossimo allenamento'}</h2><div class="subtitle">${html(dateLabel(date,{weekday:'long',day:'numeric',month:'long'}))}</div></div><button class="link-button" type="button" data-action="nav" data-target="plan">Scheda ${icon('chev',16)}</button></div>
    <div class="card raised"><div class="row between top"><div><div class="eyebrow">${html(dayLabel(next))} · Sessione ${w.days.indexOf(next)+1}</div><h3 class="h2" style="margin-top:9px">${html(next.title)}</h3><p class="small muted" style="margin:7px 0 16px">${next.exercises.length} esercizi · ${plannedSetCount(next)} serie previste</p></div><div class="day-icon">${icon('dumbbell',24)}</div></div>
    <div style="margin-bottom:16px">${next.exercises.slice(0,3).map(e=>`<div class="exercise-line"><div class="exercise-bullet">${icon('check',14)}</div><div class="flex-1"><div class="name">${html(e.name)}</div><div class="desc">${e.setsTarget} × ${e.repMin}–${e.repMax} ${e.unit==='secondi'?'sec':'rip.'}</div></div></div>`).join('')}</div>
    <button class="btn full arrow" type="button" data-action="workout" data-id="${next.id}">${next.completedAt?'Rivedi allenamento':'Apri allenamento'} ${icon('arrow',18)}</button></div></section>
    ${state.weeks.some(week=>week.start>w.start)?`<section class="section"><div class="info-card">${icon('sparkle',20)}<div><div class="semibold small">Hai già preparato una nuova settimana</div><p>Trovi la scheda successiva nella sezione Scheda, con i suggerimenti sui carichi.</p></div></div></section>`:''}
    <section class="section"><div class="card ai-home-banner"><div class="row between"><span class="chip accent">${icon('sparkle',14)} NOVITÀ 1.2</span><span class="mini muted">Gratis con ChatGPT Go</span></div><h2 class="h2" style="margin:14px 0 7px">Analizza con il coach AI</h2><p class="small muted" style="line-height:1.6;margin:0 0 14px">Prepara un report anonimo da copiare in ChatGPT e approva le eventuali modifiche alla scheda.</p><button class="btn full arrow" type="button" data-action="nav" data-target="ai">Apri AI Bridge ${icon('arrow',18)}</button></div></section>
    <section><div class="info-card">${icon('shield',20)}<div><div class="semibold small">Nessun invio automatico dei dati</div><p>Il diario resta locale. Solo tu decidi se incollare un report in ChatGPT. Esporta periodicamente un backup dal Profilo.</p></div></div></section>`;
}
function renderPlan(){
  const w=getWeek();const idx=state.weeks.findIndex(x=>x.id===w.id);
  const stat=weekCompletion(w);const isLast=idx===state.weeks.length-1;
  return `<section class="section"><div class="eyebrow">IL TUO PROGRAMMA</div><h1 class="h1">Scheda settimanale</h1><p class="body mt-0">Allenamenti modificabili, serie e carichi sempre a portata di mano.</p><div class="row wrap" style="margin:15px 0"><button class="btn secondary tiny" type="button" data-action="nav" data-target="calendar">${icon('calendar',15)} Calendario</button><button class="btn secondary tiny" type="button" data-action="nav" data-target="library">${icon('book',15)} Libreria esercizi</button></div>
  <div class="week-switch"><button class="btn secondary square" type="button" aria-label="Settimana precedente" data-action="move-week" data-delta="-1" ${idx<=0?'disabled':''}>${icon('back')}</button><div class="week-name">${html(weekLabel(w.start))}<small>${isWeekFuture(w)?'SETTIMANA FUTURA':w.start===mondayISO()?'SETTIMANA CORRENTE':'SETTIMANA SALVATA'}</small></div><button class="btn secondary square" type="button" aria-label="Settimana successiva" data-action="move-week" data-delta="1" ${idx>=state.weeks.length-1?'disabled':''}>${icon('arrow')}</button></div>
  <div class="row between" style="margin-bottom:17px"><span class="chip">${icon('target',14)} ${html(FOCUSES[state.profile.focus]?.title||'Allenamento')}</span><span class="small muted">${stat.completed} di ${stat.total} sessioni</span></div>
  ${w.days.some(d=>!d.completedAt && isoForDay(w,d)<dateISO())?`<div class="info-card" style="margin-bottom:15px">${icon('calendar',20)}<div class="flex-1"><div class="semibold small">Hai delle sedute da recuperare</div><p>Riprogrammale negli spazi liberi dei prossimi giorni, senza perderle.</p><button class="btn secondary tiny" type="button" data-action="auto-reschedule" data-week-id="${w.id}" style="margin-top:11px">${icon('refresh',15)} Riprogramma i giorni saltati</button></div></div>`:''}
  ${w.days.map((day,i)=>renderPlanDay(day,w,i)).join('')}
  <button class="btn secondary full" type="button" data-action="generate-next" ${!isLast?'disabled':''}>${icon('sparkle',19)} Genera la prossima settimana</button>
  <p class="footer-caption">${isLast?'La nuova scheda utilizza serie, ripetizioni e carichi registrati. Puoi generarla anche prima della fine della settimana.':'Per generare un nuovo piano passa all’ultima settimana salvata.'}</p></section>`;
}
function renderPlanDay(day,week,i){
  const done=Boolean(day.completedAt);
  const missed=!done && isoForDay(week,day)<dateISO();
  return `<article class="day-card ${done?'completed':''}"><div class="row"><div class="day-icon">${done?icon('check',23):html(dayLabel(day))}</div><div class="flex-1"><div class="day-title">${html(day.title)}</div><div class="day-sub">${html(dateLabel(isoForDay(week,day),{weekday:'long',day:'numeric',month:'short'}))} · ${day.exercises.length} esercizi</div></div><span class="chip ${done?'complete':missed?'warn':''}">${done?'Fatto':missed?'Da recuperare':'In programma'}</span></div>
    <div style="margin-top:13px">${day.exercises.map(ex=>`<div class="exercise-line"><div class="flex-1"><div class="name">${html(ex.name)}</div><div class="desc">${ex.setsTarget} serie · ${ex.repMin}–${ex.repMax} ${ex.unit==='secondi'?'sec':'rip.'} ${ex.targetWeight?`· ${pretty(ex.targetWeight)} kg`:''}</div></div><button class="btn ghost icon-only" aria-label="Modifica ${html(ex.name)}" type="button" data-action="edit-exercise" data-day-id="${day.id}" data-ex-id="${ex.id}">${icon('edit',15)}</button></div>`).join('')}</div>
    <div class="row" style="margin-top:13px"><button class="btn full" type="button" data-action="workout" data-id="${day.id}">${done?'Rivedi':'Apri'} ${html(dayLabel(day))} ${icon('arrow',17)}</button><button class="btn secondary square" aria-label="Sposta ${html(day.title)}" type="button" data-action="reschedule-day" data-day-id="${day.id}">${icon('calendar',17)}</button><button class="btn secondary square" aria-label="Aggiungi esercizio a ${html(day.title)}" type="button" data-action="add-exercise" data-day-id="${day.id}">${icon('plus',19)}</button></div>
    ${day.exercises.some(e=>e.insight)?`<div class="small muted" style="margin-top:11px">${icon('sparkle',13)} <span style="display:inline">Suggerimenti di progressione disponibili negli allenamenti</span></div>`:''}
  </article>`;
}
function renderWorkout(){
  const found=workoutById(activeWorkoutId);
  if(!found){view='plan';return renderPlan();}
  const {week,day}=found;
  const done=completedSetCount(day);const total=plannedSetCount(day);
  return `<section class="section"><button class="back-button" type="button" data-action="back-to-plan">${icon('back',18)} Torna alla scheda</button>
  <div class="eyebrow">${html(dayLabel(day))} · ${html(dateLabel(isoForDay(week,day)))}</div><h1 class="h1">${html(day.title)}</h1>
  <p class="body mt-0">Registra ogni serie. Le modifiche vengono salvate automaticamente sul telefono.</p>
  ${renderRestTimer()}
  <div class="row between" style="margin-bottom:9px"><span class="small semibold">${done} / ${total} serie registrate</span><span class="chip ${day.completedAt?'complete':''}">${day.completedAt?'Allenamento completato':'In svolgimento'}</span></div>
  <div class="progress-track" style="margin-bottom:23px"><span style="width:${total?Math.round(done/total*100):0}%"></span></div>
  ${day.exercises.map((ex,i)=>renderSessionExercise(day,ex,i)).join('')}
  <div class="stack" style="margin-top:18px"><button class="btn secondary full" type="button" data-action="add-exercise" data-day-id="${day.id}">${icon('plus',18)} Aggiungi esercizio</button>
  ${day.completedAt?`<button class="btn ghost full" type="button" data-action="reopen-day" data-id="${day.id}">${icon('refresh',18)} Riapri allenamento</button>`:`<button class="btn full" type="button" data-action="finish-day" data-id="${day.id}">${icon('check',20)} Concludi allenamento</button>`}</div>
  <p class="footer-caption">RIR = ripetizioni che pensi di poter ancora eseguire. Il carico suggerito è indicativo: la tecnica e il recupero hanno la priorità.</p></section>`;
}
function renderSessionExercise(day,ex,index){
  return `<article class="workout-section"><div class="row between top"><div class="flex-1"><span class="eyebrow">Esercizio ${index+1} · ${html(ex.muscle)}</span><div class="exercise-name" style="margin-top:7px">${html(ex.name)}</div><div class="small muted" style="margin-top:5px">${ex.setsTarget} × ${ex.repMin}–${ex.repMax} ${ex.unit==='secondi'?'sec':'rip.'} ${ex.targetWeight?`· obiettivo ${pretty(ex.targetWeight)} kg`:'· inserisci il carico usato'}</div></div><button class="btn ghost tiny" type="button" data-action="alternatives" data-day-id="${day.id}" data-ex-id="${ex.id}">Alternative</button><button class="btn ghost icon-only" type="button" aria-label="Modifica esercizio" data-action="edit-exercise" data-day-id="${day.id}" data-ex-id="${ex.id}">${icon('edit',16)}</button></div>
  ${renderPreviousExercise(ex,day.id)}
  ${ex.insight?`<div class="hint" style="margin-top:13px">${icon('sparkle',16)}<span>${html(ex.insight)}</span></div>`:''}
  <div class="set-header"><span>Serie</span><span>Kg</span><span>${ex.unit==='secondi'?'Sec.':'Rip.'}</span><span>RIR</span><span>OK</span></div>
  ${ex.logs.map((set,i)=>`<div class="set-row ${set.done?'is-done':''}"><span class="set-number">${i+1}</span><input class="set-input" type="number" inputmode="decimal" min="0" max="1000" step="0.5" aria-label="Peso in kg serie ${i+1} ${html(ex.name)}" data-log-field="weight" data-day-id="${day.id}" data-ex-id="${ex.id}" data-index="${i}" value="${set.weight?html(set.weight):''}" placeholder="kg"><input class="set-input" type="number" inputmode="numeric" min="1" max="999" step="1" aria-label="${ex.unit==='secondi'?'Secondi':'Ripetizioni'} serie ${i+1} ${html(ex.name)}" data-log-field="reps" data-day-id="${day.id}" data-ex-id="${ex.id}" data-index="${i}" value="${set.reps===null?'':html(set.reps)}" placeholder="rip"><select class="set-input set-select" data-log-field="rir" data-day-id="${day.id}" data-ex-id="${ex.id}" data-index="${i}" aria-label="Ripetizioni in riserva serie ${i+1}"><option value="" ${set.rir===null?'selected':''}>—</option>${[0,1,2,3,4,5].map(n=>`<option value="${n}" ${set.rir===n?'selected':''}>${n}</option>`).join('')}</select><button class="check-set ${set.done?'checked':''}" type="button" data-action="toggle-set" data-day-id="${day.id}" data-ex-id="${ex.id}" data-index="${i}" aria-label="${set.done?'Deseleziona':'Conferma'} serie ${i+1}" aria-pressed="${Boolean(set.done)}">${icon('check',18)}</button></div>`).join('')}
  ${renderQuickActions(ex,day)}
  <label class="note-label" for="note-${ex.id}">Note (facoltative)</label><textarea class="note-area" id="note-${ex.id}" maxlength="500" placeholder="Tecnica, sensazioni, recupero..." data-note="1" data-day-id="${day.id}" data-ex-id="${ex.id}">${html(ex.note)}</textarea>
  </article>`;
}
function volumeForWeek(week){return week.days.reduce((vol,day)=>vol+day.exercises.reduce((v,ex)=>v+ex.logs.reduce((t,s)=>t+(s.done?Number(s.weight||0)*Number(s.reps||0):0),0),0),0);}
function renderProgress(){
  const weeks=state.weeks;
  const allDays=weeks.flatMap(w=>w.days);
  const completed=allDays.filter(d=>d.completedAt).length;
  const logged=allDays.reduce((n,d)=>n+completedSetCount(d),0);
  const volume=weeks.reduce((n,w)=>n+volumeForWeek(w),0);
  const points=state.weightHistory.slice(-10);
  const maxVol=Math.max(1,...weeks.slice(-6).map(volumeForWeek));
  const bars=weeks.slice(-6).map((w,i)=>{const vol=volumeForWeek(w);return `<div class="chart-col" title="${html(weekLabel(w.start))}: ${pretty(vol)} kg-rip"><div class="chart-bar" style="height:${Math.max(3,vol/maxVol*100)}%"></div><small>${html(dateLabel(w.start,{day:'numeric',month:'short'}))}</small></div>`;}).join('');
  return `<section class="section"><div class="eyebrow">IL TUO PERCORSO</div><h1 class="h1">Progressi</h1><p class="body mt-0">Numeri semplici, per capire quanto sei costante.</p></section>
  <section class="section"><div class="metric-grid"><div class="metric"><strong>${completed}</strong><span>Sessioni concluse</span></div><div class="metric"><strong>${logged}</strong><span>Serie totali</span></div><div class="metric"><strong>${weeks.length}</strong><span>Settimane create</span></div></div></section>
  <section class="section"><div class="section-head"><div><h2 class="h2">Volume sollevato</h2><div class="subtitle">Somma di kg × ripetizioni registrate</div></div></div><div class="card"><div class="row between"><span class="small muted">Volume totale</span><strong style="font-size:20px">${pretty(volume)} <span class="small muted">kg·rip.</span></strong></div><div class="chart">${bars}</div><p class="field-hint">Non è una misura diretta di forza. Esercizi a corpo libero senza carico aggiunto non contribuiscono al totale.</p></div></section>
  <section class="section"><div class="section-head"><div><h2 class="h2">Peso corporeo</h2><div class="subtitle">Le tue ultime ${points.length} registrazioni</div></div><button class="btn secondary tiny" type="button" data-action="add-weight">${icon('plus',15)} Aggiungi</button></div><div class="card"><div class="row between"><div><span class="small muted">Ultima rilevazione</span><div style="font-size:28px;font-weight:870;margin-top:5px">${pretty(points.at(-1)?.kg)} <span class="muted small">kg</span></div></div>${points.length>1?`<span class="chip">${pretty(points.at(-1).kg-points[0].kg)} kg</span>`:''}</div>
    ${renderWeightPlot(points)}</div></section>${renderRecordsPanel()}<div class="info-card">${icon('info',20)}<div><div class="semibold small">Una progressione non è sempre lineare</div><p>Le raccomandazioni sono regole di supporto, non indicazioni mediche. Se hai dolore, interrompi l'esercizio e chiedi un parere professionale.</p></div></div>`;
}
function renderWeightPlot(points){
  if(points.length<2)return '<p class="small muted" style="margin:18px 0 0">Aggiungi una seconda misurazione per vedere il grafico.</p>';
  const values=points.map(p=>Number(p.kg));
  const lo=Math.floor(Math.min(...values)-1);const hi=Math.ceil(Math.max(...values)+1);
  const h=150,w=330,padX=16,padY=22;
  const coords=values.map((v,i)=>({x:padX+(w-padX*2)*(i/(values.length-1)),y:padY+(h-2*padY)*(1-(v-lo)/(hi-lo||1))}));
  const d=coords.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  return `<svg class="weight-plot" viewBox="0 0 330 175" role="img" aria-label="Andamento del peso corporeo"><line x1="16" y1="35" x2="314" y2="35" class="gridline"/><line x1="16" y1="115" x2="314" y2="115" class="gridline"/><path class="path" d="${d}"/>${coords.map(p=>`<circle class="point" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5"/>`).join('')}<text x="16" y="165">${html(dateLabel(points[0].date))}</text><text x="314" y="165" text-anchor="end">${html(dateLabel(points.at(-1).date))}</text></svg>`;
}
function renderSettings(){
  const p=state.profile;
  return `<section class="section"><div class="eyebrow">IMPOSTAZIONI</div><h1 class="h1">Il tuo profilo</h1><p class="body mt-0">Controlli tu i tuoi dati. Nessun account necessario.</p></section>
  <section class="section"><div class="card"><div class="row between"><div class="row"><div class="day-icon" style="font-size:21px">${html((p.firstName||'F').slice(0,1).toUpperCase())}</div><div><div class="h3">${html(p.firstName)} ${html(p.lastName)}</div><p class="small muted" style="margin:6px 0 0">${html(FOCUSES[p.focus]?.title||'Allenamento')} · ${p.days} giorni/settimana</p></div></div><button class="btn secondary icon-only" type="button" data-action="edit-profile" aria-label="Modifica profilo">${icon('edit',17)}</button></div><div class="soft-divider"></div><div class="row between"><span class="small muted">Peso attuale</span><strong>${pretty(p.weight)} kg</strong></div><div class="row between" style="margin-top:13px"><span class="small muted">Settimane salvate</span><strong>${state.weeks.length}</strong></div></div></section>
  <section class="section"><div class="section-head"><h2 class="h2">Backup dei dati</h2></div><div class="card"><div class="info-card" style="margin-bottom:15px">${icon('shield',20)}<div><div class="semibold small">Tutto sul tuo dispositivo</div><p>Il database vive nel browser su questo telefono. Una disinstallazione o la cancellazione dei dati del sito può eliminarlo.</p></div></div>
  <div class="stack"><button class="btn full arrow" type="button" data-action="backup-export">Esporta backup JSON ${icon('down',20)}</button><button class="btn secondary full arrow" type="button" data-action="backup-import">Ripristina da un file ${icon('up',19)}</button></div>
  <p class="footer-caption">${state.settings.lastBackupAt?`Ultimo download avviato: ${html(new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'short',year:'numeric'}).format(new Date(state.settings.lastBackupAt)))}.`:'Non hai ancora esportato un backup.'} Salva una copia fuori dal telefono per maggiore sicurezza. Nessun backup automatico sul cloud.</p></div></section>
  <section class="section"><div class="section-head"><h2 class="h2">Recupero tra le serie</h2></div><div class="card"><form data-form="rest-settings" class="stack"><div class="form-grid"><div class="field"><label for="rest-base">Esercizi base</label><select id="rest-base" name="restBase">${[60,75,90,120,150,180].map(n=>`<option value="${n}" ${state.settings.rest.base===n?'selected':''}>${n} secondi</option>`).join('')}</select></div><div class="field"><label for="rest-accessory">Complementari</label><select id="rest-accessory" name="restAccessory">${[45,60,75,90,120,150].map(n=>`<option value="${n}" ${state.settings.rest.accessory===n?'selected':''}>${n} secondi</option>`).join('')}</select></div></div><label class="toggle-label"><input type="checkbox" name="restSound" ${state.settings.rest.sound?'checked':''}> Suono al termine (quando supportato)</label><label class="toggle-label"><input type="checkbox" name="restVibrate" ${state.settings.rest.vibrate?'checked':''}> Vibrazione su Android (se supportata)</label><button class="btn secondary full" type="submit">Salva timer</button></form><p class="field-hint" style="margin-top:12px">Il conto alla rovescia usa l’orologio del telefono. Suono e vibrazione in background non sono garantiti: non sono notifiche push.</p></div></section>
  <section class="section"><div class="section-head"><h2 class="h2">Archivio locale</h2></div><div class="card"><div class="setting-row"><div class="setting-icon">${icon('lock',20)}</div><div class="flex-1"><div class="setting-title">Proteggi i dati offline</div><div class="setting-desc">Richiedi al browser di ridurre il rischio di eliminazione automatica dei dati.</div></div><button class="btn secondary tiny" type="button" data-action="storage-persist">Attiva</button></div>
  <div class="setting-row"><div class="setting-icon">${icon('trash',20)}</div><div class="flex-1"><div class="setting-title">Azzera il diario</div><div class="setting-desc">Elimina profilo, schede, registrazioni e progressi da questo browser.</div></div><button class="btn danger tiny" type="button" data-action="reset-app">Azzera</button></div></div></section>
  <p class="footer-caption">FORMA · Versione 1.2 · L'app non invia dati automaticamente: solo un eventuale report che decidi di incollare in ChatGPT viene elaborato online. Per installarla come app offline è necessaria una prima apertura via HTTPS.</p>`;
}
function renderAiBridge(){
  const w=latestWeek();
  const logged=w.days.some(d=>d.completedAt||d.exercises.some(e=>e.logs.some(log=>log.done)));
  const used=state.settings?.aiBridge;
  const preview=pendingAiProposal;
  return `<section class="section"><div class="eyebrow">FORMA 1.2 / CHATGPT GO</div><h1 class="h1">AI Coach Bridge <span style="color:var(--accent)">✦</span></h1>
    <p class="body mt-0">Fai analizzare i tuoi allenamenti a ChatGPT Go, senza API e senza altri abbonamenti. Tutto parte da una tua azione.</p></section>
    <section class="section"><div class="card ai-steps"><div class="row between"><span class="chip accent">${icon('shield',14)} NESSUN INVIO AUTOMATICO</span><span class="small muted">Piano: ${html(weekLabel(w.start))}</span></div>
    <div class="ai-step"><span class="ai-step-number">1</span><div class="flex-1"><h2 class="h2">Prepara il report</h2><p class="small muted">L'app riassume fino a 6 settimane. Il nome e il cognome del profilo NON sono inclusi.</p></div></div>
    <div class="ai-controls"><div class="field"><label for="ai-report-weeks">Settimane da analizzare</label><select id="ai-report-weeks" data-ai-option="weeks">${[2,4,6].map(n=>`<option value="${n}" ${aiReportWeeks===n?'selected':''}>Ultime ${n} settimane</option>`).join('')}</select></div>
    <label class="toggle-label"><input type="checkbox" data-ai-option="weight" ${aiIncludeWeight?'checked':''}> Includi peso corporeo</label>
    <label class="toggle-label"><input type="checkbox" data-ai-option="notes" ${aiIncludeNotes?'checked':''}> Includi note sugli esercizi</label></div>
    <div class="stack"><button class="btn full arrow" type="button" data-action="ai-copy">${icon('down',18)} Copia report e istruzioni ${icon('arrow',18)}</button>
    <div class="ai-two-buttons"><button class="btn secondary" type="button" data-action="ai-download">${icon('down',16)} Salva TXT</button><button class="btn secondary" type="button" data-action="ai-open-chatgpt">Apri ChatGPT ${icon('arrow',16)}</button></div></div>
    <p class="field-hint" style="margin-top:11px">Incolla il testo in una conversazione ChatGPT. Se usi un Progetto dedicato a FORMA, aprilo manualmente prima di incollare. Il pulsante Apri ChatGPT non inoltra alcun dato.</p></div></section>
    <section class="section"><div class="card ai-steps"><div class="ai-step"><span class="ai-step-number">2</span><div class="flex-1"><h2 class="h2">Incolla la risposta</h2><p class="small muted">Chiedi a ChatGPT di seguire le istruzioni nel report e di restituire solo JSON. Poi copia il JSON qui sotto.</p></div></div>
    <div class="field"><label for="ai-response">Proposta in formato JSON</label><textarea id="ai-response" class="ai-json" rows="7" maxlength="50000" spellcheck="false" placeholder='{"format":"forma-ai-proposal", "version":1, ...}'>${html(aiTextDraft)}</textarea></div>
    <button class="btn secondary full arrow" type="button" data-action="ai-preview">Controlla la proposta ${icon('arrow',17)}</button>
    <p class="field-hint" style="margin-top:10px">Nessuna modifica verrà applicata senza anteprima, selezione e conferma.</p></div></section>
    ${preview?`<section class="section" id="ai-preview-section"><div class="card ai-steps"><div class="ai-step"><span class="ai-step-number">3</span><div class="flex-1"><h2 class="h2">Scegli e conferma</h2><p class="small muted">${preview.previews.length} modifiche proposte · settimana ${html(preview.proposal.weekStart)}</p></div></div>
    <div class="ai-summary">${icon('sparkle',18)} <div><strong>Analisi di ChatGPT</strong><p>${html(preview.proposal.summary)}</p></div></div>
    ${preview.proposal.warnings.length?`<div class="ai-warnings"><strong>Note del coach</strong>${preview.proposal.warnings.map(w=>`<p>• ${html(w)}</p>`).join('')}</div>`:''}
    ${preview.previews.length?`<p class="small muted">Seleziona soltanto le modifiche che vuoi applicare:</p>${preview.previews.map(p=>`<label class="ai-change"><input type="checkbox" data-ai-select="${html(p.key)}" ${aiSelectedKeys.has(p.key)?'checked':''}><span class="flex-1"><strong>${html(p.name)}</strong><span class="ai-change-day">${html(p.dayTitle)}</span>${p.fields.map(f=>`<span class="ai-delta"><span>${html(f.label)}</span><b>${html(f.from)} → ${html(f.to)}</b></span>`).join('')}<span class="ai-reason">${html(p.reason)}</span></span></label>`).join('')}
      <div class="ai-apply-footer"><p class="small muted" id="ai-selected-count">${aiSelectedKeys.size} selezionate su ${preview.previews.length}</p><button class="btn full" type="button" data-action="ai-apply" ${!aiSelectedKeys.size?'disabled':''}>${icon('check',18)} Applica selezionate</button></div>`:'<div class="info-card">Nessuna modifica da applicare: il coach ha fornito solo un’analisi. Puoi usare le indicazioni per pianificare in seguito.</div>'}
    </div></section>`:''}
    <section class="section"><div class="info-card">${icon('info',20)}<div><div class="semibold small">Privacy e limiti</div><p>Solo il testo che copi e incolli in ChatGPT lascia il telefono. Controlla nomi personalizzati degli esercizi e note prima di condividerli. FORMA non è collegata all'account Go e non ha accesso alla risposta finché non la incolli. I suggerimenti AI non sono indicazioni mediche.</p></div></div>
    ${logged?`<div class="info-card" style="margin-top:11px">${icon('calendar',20)}<div><div class="semibold small">Hai già registrato serie nell'ultima settimana</div><p>Il coach può analizzarle, ma non modificare esercizi già eseguiti. Se vuoi un nuovo piano completo, crea prima la settimana successiva in Scheda.</p><button class="btn secondary tiny" data-action="nav" data-target="plan" type="button" style="margin-top:9px">Vai alla Scheda</button></div></div>`:''}
    ${used?.lastAppliedAt?`<p class="footer-caption">Ultime modifiche AI approvate: ${html(used.lastAppliedCount)} il ${html(new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'long',year:'numeric'}).format(new Date(used.lastAppliedAt)))}.</p>`:''}
    </section>`;
}
async function copyAiReport(){
  const report=createAiReport(state,{weeks:aiReportWeeks,includeWeight:aiIncludeWeight,includeNotes:aiIncludeNotes});
  if(navigator.clipboard?.writeText){
    try{await navigator.clipboard.writeText(report.text);inform('Report copiato. Apri ChatGPT e incollalo.');return;}
    catch(error){console.warn('Appunti: tentativo alternativo',error);}
  }
  const input=document.createElement('textarea');input.value=report.text;input.style.cssText='position:fixed;left:-9999px;top:0';document.body.append(input);input.focus();input.select();
  const ok=document.execCommand('copy');input.remove();
  if(!ok)throw Error('Impossibile copiare automaticamente. Usa Salva TXT.');
  inform('Report copiato. Apri ChatGPT e incollalo.');
}
function downloadAiReport(){
  const text=createAiReport(state,{weeks:aiReportWeeks,includeWeight:aiIncludeWeight,includeNotes:aiIncludeNotes}).text;
  const blob=new Blob([text],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`FORMA-report-AI-${dateISO()}.txt`;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),15000);inform('Report scaricato. Incollalo o allegalo a ChatGPT.');
}
function openDialog(body){dialog.innerHTML=`<div class="dialog-wrap">${body}</div>`;dialog.showModal();}
function closeDialog(){if(dialog.open)dialog.close();dialog.innerHTML='';}
function dialogTop(title){return `<div class="dialog-heading"><div class="dialog-title">${html(title)}</div><button class="btn ghost icon-only" type="button" data-action="close-dialog" aria-label="Chiudi">${icon('x',18)}</button></div>`;}
function openProfileDialog(){const p=state.profile;openDialog(`${dialogTop('Modifica profilo')}<form class="dialog-form" data-form="edit-profile"><div class="form-grid">${htmlField('Nome','firstName',p.firstName)}${htmlField('Cognome','lastName',p.lastName)}</div><div class="field"><label>Giorni a settimana</label>${dayChoices(p.days)}</div><div class="field"><label>Focus principale</label>${focusChoices(p.focus)}</div><p class="field-hint">Le modifiche alla frequenza o al focus saranno applicate quando crei una nuova settimana. Il peso si aggiorna dalla sezione Progressi.</p><div class="dialog-actions"><button class="btn secondary" type="button" data-action="close-dialog">Annulla</button><button class="btn" type="submit">Salva</button></div></form>`);}
function openWeightDialog(){openDialog(`${dialogTop('Registra il peso')}<form class="dialog-form" data-form="add-weight">${htmlField('Peso corporeo (kg)','weight',state.profile.weight,{type:'number',min:20,max:400,step:'0.1'})}<div class="field">${htmlField('Data della misurazione','date',dateISO(),{type:'date'})}</div><div class="dialog-actions"><button class="btn secondary" type="button" data-action="close-dialog">Annulla</button><button class="btn" type="submit">Salva peso</button></div></form>`);}
function openExerciseDialog(dayId,exId=null){
  const found=workoutById(dayId);if(!found)return;
  const ex=exId?exerciseById(found.day,exId):null;
  const first=ex ? state.exercises.find(item=>item.id===ex.exerciseId) : state.exercises[0];
  const fromLibrary=Boolean(first);
  const choices=state.exercises.map(item=>`<option value="${html(item.id)}" ${first?.id===item.id?'selected':''}>${html(item.name)} · ${html(item.muscle)}</option>`).join('');
  openDialog(`${dialogTop(ex?'Modifica esercizio':'Aggiungi esercizio')}<form class="dialog-form" data-form="exercise" data-day-id="${html(dayId)}" data-ex-id="${html(exId||'')}">
    <div class="field"><label for="exercise-catalog">Esercizio</label><select id="exercise-catalog" name="catalog"><option value="__custom" ${ex&&!fromLibrary?'selected':''}>+ Nuovo esercizio personale</option>${choices}</select></div>
    <div id="custom-exercise-fields" class="stack ${ex&&!fromLibrary?'':'hidden'}">${htmlField('Nome esercizio','customName',ex&&!fromLibrary?ex.name:'',{required:false,placeholder:'Es. Hip thrust'})}<div class="field"><label for="customMuscle">Gruppo muscolare</label><select id="customMuscle" name="customMuscle">${['Gambe','Petto','Schiena','Spalle','Bicipiti','Tricipiti','Core','Cardio','Altro'].map(m=>`<option value="${m}" ${ex?.muscle===m?'selected':''}>${m}</option>`).join('')}</select></div><div class="field"><label for="customUnit">Unità di misura</label><select id="customUnit" name="customUnit"><option value="ripetizioni" ${ex?.unit!=='secondi'?'selected':''}>Ripetizioni</option><option value="secondi" ${ex?.unit==='secondi'?'selected':''}>Secondi</option></select></div></div>
    <div class="form-grid">${htmlField('Numero di serie','sets',ex?.setsTarget??3,{type:'number',min:1,max:8,step:'1'})}${htmlField('Carico obiettivo (kg)','weight',ex?.targetWeight??0,{type:'number',min:0,max:1000,step:'0.5'})}${htmlField('Minimo (rip. o sec.)','min',ex?.repMin??8,{type:'number',min:1,max:999,step:'1'})}${htmlField('Massimo (rip. o sec.)','max',ex?.repMax??12,{type:'number',min:1,max:999,step:'1'})}</div>
    <p class="field-hint">Le serie già registrate restano associate a questo esercizio, salvo che tu cambi esercizio o riduca il numero di serie.</p>
    ${ex?`<button class="btn danger full" type="button" data-action="delete-exercise" data-day-id="${html(dayId)}" data-ex-id="${html(ex.id)}">${icon('trash',16)} Rimuovi esercizio</button>`:''}
    <div class="dialog-actions"><button class="btn secondary" type="button" data-action="close-dialog">Annulla</button><button class="btn" type="submit">${ex?'Salva modifiche':'Aggiungi'}</button></div></form>`);
  updateCustomExerciseFields();
}
function updateCustomExerciseFields(){const select=dialog.querySelector('[name=catalog]');const block=dialog.querySelector('#custom-exercise-fields');if(block)block.classList.toggle('hidden',select?.value!=='__custom');}
function ensureLocalSettings(){
  state.settings ||= {lastBackupAt:null};
  const old=state.settings.rest||{};
  const validDuration=n=>Number.isInteger(n)&&n>=15&&n<=600;
  state.settings.rest={base:validDuration(old.base)?old.base:120,
    accessory:validDuration(old.accessory)?old.accessory:75,
    sound:typeof old.sound==='boolean'?old.sound:true,
    vibrate:typeof old.vibrate==='boolean'?old.vibrate:true,
    timer:old.timer&&Number.isFinite(Number(old.timer.endAt))&&Number.isInteger(old.timer.duration)
      ?old.timer:null};
  const lastAi=state.settings.aiBridge;
  if(lastAi && (typeof lastAi!=='object'||!Number.isFinite(Date.parse(lastAi.lastAppliedAt))||
       !Number.isInteger(lastAi.lastAppliedCount)||lastAi.lastAppliedCount<0||lastAi.lastAppliedCount>25||
       typeof lastAi.lastAppliedWeek!=='string'))delete state.settings.aiBridge;
}
function fmtSeconds(total){const sec=Math.max(0,Math.ceil(Number(total)||0));return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;}
function getTimer(){return state?.settings?.rest?.timer||null;}
function remainingSeconds(timer=getTimer()){
  if(!timer)return 0;
  return timer.running?Math.max(0,Math.ceil((timer.endAt-Date.now())/1000)):
    Math.max(0,Math.ceil(timer.pausedRemaining||0));
}
function unlockAudio(){
  if(!state?.settings?.rest?.sound)return;
  try{
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(!Ctx)return;
    audioContext ||= new Ctx();
    if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
  }catch(_error){}
}
function alertRecoveryEnd(){
  if(document.visibilityState==='hidden')return;
  const settings=state?.settings?.rest;
  if(settings?.vibrate&&navigator.vibrate)try{navigator.vibrate([180,90,180]);}catch(_error){}
  if(settings?.sound){
    try{
      unlockAudio();
      if(audioContext && audioContext.state==='running'){
        const osc=audioContext.createOscillator();const gain=audioContext.createGain();
        osc.type='sine';osc.frequency.setValueAtTime(830,audioContext.currentTime);
        gain.gain.setValueAtTime(0.11,audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001,audioContext.currentTime+0.35);
        osc.connect(gain);gain.connect(audioContext.destination);
        osc.start();osc.stop(audioContext.currentTime+0.36);
      }
    }catch(_error){}
  }
  inform('Recupero terminato: valuta se sei pronto per la prossima serie.');
}
function startRestTimer(seconds,exerciseName='Recupero'){
  unlockAudio();
  const duration=Math.min(600,Math.max(15,Number(seconds)||90));
  state.settings.rest.timer={duration, endAt:Date.now()+duration*1000,running:true,
    pausedRemaining:null,finished:false,exerciseName:String(exerciseName).slice(0,150)};
  timerAlertedEnd=null;
}
function tickRestTimer(){
  const timer=getTimer();if(!timer)return;
  const left=remainingSeconds(timer);
  if(timer.running && left<=0){
    timer.running=false;timer.pausedRemaining=0;timer.finished=true;
    if(timerAlertedEnd!==timer.endAt){timerAlertedEnd=timer.endAt;alertRecoveryEnd();}
    persist();
    if(view==='workout')render();
    return;
  }
  const text=document.getElementById('rest-countdown');
  if(text)text.textContent=fmtSeconds(left);
  const bar=document.getElementById('rest-progress');
  if(bar)bar.style.width=`${Math.min(100,Math.max(0,(1-left/timer.duration)*100))}%`;
}
function renderRestTimer(){
  const timer=getTimer();const left=remainingSeconds(timer);
  if(!timer)return `<div class="rest-card"><div class="row between"><div class="row">${icon('clock',22)}<div><div class="semibold">Timer recupero</div><div class="mini muted">Si avvia automaticamente dopo ogni serie</div></div></div></div><div class="rest-presets"><button type="button" class="btn secondary tiny" data-action="rest-start" data-secs="60">60 sec</button><button type="button" class="btn secondary tiny" data-action="rest-start" data-secs="90">90 sec</button><button type="button" class="btn secondary tiny" data-action="rest-start" data-secs="120">120 sec</button></div></div>`;
  return `<div class="rest-card ${timer.finished?'finished':''}"><div class="row between"><div class="flex-1"><div class="eyebrow">${timer.finished?'RECUPERO TERMINATO':timer.running?'RECUPERO IN CORSO':'RECUPERO IN PAUSA'}</div><div class="small muted" style="margin-top:5px">${html(timer.exerciseName||'Recupero')}</div></div><strong id="rest-countdown" class="rest-countdown" role="timer">${fmtSeconds(left)}</strong></div><div class="progress-track rest-track"><span id="rest-progress" style="width:${Math.min(100,Math.max(0,(1-left/timer.duration)*100))}%"></span></div><div class="row wrap" style="margin-top:12px"><button class="btn secondary tiny" type="button" data-action="rest-${timer.running?'pause':'resume'}" ${timer.finished?'disabled':''}>${icon(timer.running?'pause':'play',15)} ${timer.running?'Pausa':'Riprendi'}</button><button class="btn secondary tiny" type="button" data-action="rest-plus">+15 sec</button><button class="btn ghost tiny" type="button" data-action="rest-dismiss">Chiudi</button></div></div>`;
}
function renderPreviousExercise(ex,dayId){
  const previous=lastExerciseSession(state.weeks,ex.exerciseId,dayId);
  if(!previous)return `<p class="mini muted" style="margin:11px 0 0">Nessuna seduta precedente registrata per questo esercizio.</p>`;
  const logs=previous.logs;
  const best=logs.reduce((a,b)=>Number(b.weight)>Number(a.weight)?b:a,logs[0]);
  return `<div class="previous-set">${icon('repeat',15)} <span>Ultima volta: <strong>${pretty(best.weight)} kg × ${best.reps} ${previous.unit==='secondi'?'sec':'rip.'}</strong>${best.rir!==null?` · RIR ${best.rir}`:''} <span class="muted">(${html(dateLabel(previous.date))})</span></span></div>`;
}
function nextQuickSet(ex,dayId){
  const i=ex.logs.findIndex(s=>!s.done);if(i<0)return null;
  const current=ex.logs[i];const previousInDay=ex.logs.slice(0,i).filter(s=>s.done).at(-1);
  const previous=lastExerciseSession(state.weeks,ex.exerciseId,dayId);
  const prior=previous?.logs[i]||previous?.logs.at(-1);
  return {index:i,weight:Number(current.weight)||Number(previousInDay?.weight)||Number(prior?.weight)||Number(ex.targetWeight)||0,
    reps:Number(current.reps)||Number(previousInDay?.reps)||Number(prior?.reps)||Number(ex.repMin)||1};
}
function renderQuickActions(ex,day){
  const next=nextQuickSet(ex,day.id);
  const duration=restDuration(ex,state.settings.rest);
  return `<div class="quick-actions">${next?`<button class="btn small flex-1" type="button" data-action="quick-set" data-day-id="${day.id}" data-ex-id="${ex.id}" ${day.completedAt?'disabled':''}>${icon('check',17)} Registra serie ${next.index+1}: ${pretty(next.weight)} kg × ${next.reps}</button>`:`<span class="chip complete">${icon('check',14)} Serie completate</span>`}<button class="btn ghost small" type="button" data-action="rest-exercise" data-day-id="${day.id}" data-ex-id="${ex.id}">${icon('clock',15)} ${duration}s</button></div><p class="field-hint" style="margin-top:8px">Il tasto rapido usa il valore proposto e lascia il RIR da compilare manualmente; verifica i dati prima di confermare.</p>`;
}
function renderCalendar(){
  const week=getWeek();
  const today=dateISO();
  const entries=sessionEntries(state.weeks);
  const missed=entries.filter(x=>x.week.id===week.id && !x.day.completedAt && x.date<today);
  const slots=Array.from({length:14},(_,i)=>{
    const date=plusDays(today,i);
    const found=entries.filter(x=>x.date===date);
    return `<div class="calendar-slot"><div class="calendar-date"><strong>${html(dateLabel(date,{weekday:'short',day:'numeric'}))}</strong><span class="mini muted">${html(dateLabel(date,{month:'short'}))}${date===today?' · OGGI':''}</span></div><div class="flex-1">${found.length?found.map(x=>`<div class="calendar-session"><span class="semibold">${html(x.day.title)}</span><span class="mini muted">${x.day.completedAt?'Completato':x.week.start===week.start?'Questa scheda':'Altra settimana'}</span><div class="row" style="margin-top:7px"><button class="link-button" type="button" data-action="workout" data-id="${x.day.id}">Apri ${icon('chev',14)}</button>${!x.day.completedAt?`<button class="link-button" type="button" data-action="reschedule-day" data-day-id="${x.day.id}">Sposta ${icon('calendar',14)}</button>`:''}</div></div>`).join(''):'<span class="mini muted">Giornata libera</span>'}</div></div>`;
  }).join('');
  return `<section class="section"><button class="back-button" data-action="nav" data-target="plan" type="button">${icon('back',18)} Scheda</button><div class="eyebrow">PIANIFICAZIONE FLESSIBILE</div><h1 class="h1">Calendario intelligente</h1><p class="body mt-0">Sposta le sedute quando serve. Nessun allenamento viene eliminato e il calendario evita di programmare due sessioni nello stesso giorno.</p></section>
  <section class="section"><div class="card"><div class="row between"><div><h2 class="h2">Recuperi in sospeso</h2><div class="subtitle">${html(weekLabel(week.start))}</div></div><span class="chip ${missed.length?'warn':''}">${missed.length} da recuperare</span></div>
  ${missed.length?`<p class="small muted">${missed.map(x=>html(x.day.title)).join(' · ')}</p><button class="btn full" type="button" data-action="auto-reschedule" data-week-id="${week.id}">${icon('refresh',17)} Trova i prossimi giorni liberi</button>`:'<p class="small muted">Nessuna seduta saltata nella settimana selezionata.</p>'}</div></section>
  <section class="section"><div class="section-head"><h2 class="h2">Prossimi 14 giorni</h2></div><div class="card calendar-list">${slots}</div></section>
  <p class="footer-caption">Gli allenamenti spostati restano associati alla scheda di origine. Se recuperi una seduta dopo la fine della settimana, verifica il carico prima di generare nuovi programmi.</p>`;
}
function filteredLibrary(){
  const term=libraryTerm.trim().toLocaleLowerCase('it');
  return state.exercises.filter(e=>(libraryMuscle==='Tutti'||e.muscle===libraryMuscle)&&
    (!term||`${e.name} ${e.muscle}`.toLocaleLowerCase('it').includes(term)));
}
function libraryResults(){
  const entries=filteredLibrary();
  if(!entries.length)return `<div class="empty-state">Nessun esercizio trovato. Cambia la ricerca o il gruppo muscolare.</div>`;
  return entries.map(ex=>{
    const guide=getExerciseGuide(ex);
    const alternatives=alternativeExercises(ex,state.exercises).map(x=>x.name);
    return `<details class="library-item"><summary><span class="library-icon">${icon('dumbbell',18)}</span><span class="flex-1"><strong>${html(ex.name)}</strong><small>${html(ex.muscle)} · ${ex.kind==='base'?'Multiarticolare':'Complementare'}</small></span>${icon('chev',18)}</summary><div class="library-body"><p>${html(guide.tip)}</p>${alternatives.length?`<div class="mini muted">Alternative: ${html(alternatives.join(' · '))}</div>`:''}<button class="btn secondary small" type="button" data-action="library-add" data-ex-id="${html(ex.id)}" style="margin-top:12px">${icon('plus',16)} Aggiungi alla scheda</button></div></details>`;
  }).join('');
}
function renderLibrary(){
  return `<section class="section"><button class="back-button" data-action="nav" data-target="plan" type="button">${icon('back',18)} Scheda</button><div class="eyebrow">TUTTO OFFLINE</div><h1 class="h1">Libreria esercizi</h1><p class="body mt-0">Consulta istruzioni sintetiche e alternative senza Internet. Puoi aggiungere un esercizio direttamente alla scheda.</p></section>
  <section class="section"><div class="field"><label for="library-search">Cerca per nome o muscolo</label><input id="library-search" type="search" data-library-search="1" placeholder="Es. panca, squat, tricipiti..." value="${html(libraryTerm)}" autocomplete="off"></div><div class="field" style="margin-top:12px"><label for="library-muscle">Gruppo muscolare</label><select id="library-muscle" data-library-muscle="1">${MUSCLES.map(m=>`<option value="${html(m)}" ${m===libraryMuscle?'selected':''}>${html(m)}</option>`).join('')}</select></div><div id="library-count" class="small muted" style="margin:15px 0">${filteredLibrary().length} esercizi</div><div id="library-results" class="library-results">${libraryResults()}</div></section>`;
}
function renderTrendPlot(points,metric){
  const clean=points.slice(-12).filter(x=>Number(x[metric])>0);
  if(!clean.length)return `<div class="empty-state">Registra almeno un carico per visualizzare questo grafico.</div>`;
  const vals=clean.map(x=>Number(x[metric]));
  const lo=Math.max(0,Math.min(...vals)*0.88),hi=Math.max(...vals)*1.12;
  const coords=vals.map((v,i)=>({x:28+(clean.length===1?150:(294*i/(clean.length-1))),y:138-(v-lo)/((hi-lo)||1)*110}));
  const d=coords.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  return `<svg class="trend-plot" viewBox="0 0 350 177" role="img" aria-label="Andamento ${html(metric)}: ${clean.map(x=>pretty(x[metric])).join(', ')}"><line x1="28" y1="138" x2="325" y2="138" class="gridline"/><line x1="28" y1="28" x2="325" y2="28" class="gridline"/><text x="28" y="19">${pretty(Math.max(...vals))}</text><path class="trend-line" d="${d}"/>${coords.map(p=>`<circle class="trend-dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5"/>`).join('')}<text x="28" y="163">${html(dateLabel(clean[0].date))}</text><text x="325" y="163" text-anchor="end">${html(dateLabel(clean.at(-1).date))}</text></svg>`;
}
function renderRecordsPanel(){
  const records=personalRecords(state.weeks,state.exercises);
  if(!records.length)return `<section class="section"><div class="section-head"><h2 class="h2">Record personali</h2></div><div class="empty-state">I record e i grafici degli esercizi compariranno dopo la prima serie registrata.</div></section>`;
  if(!records.some(r=>r.id===trendExerciseId))trendExerciseId=records[0].id;
  const metrics={maxWeight:'Carico massimo',estimated1RM:'Forza stimata',totalVolume:'Volume per seduta'};
  const trend=exerciseTrend(state.weeks,trendExerciseId,trendMetric);
  return `<section class="section"><div class="section-head"><div><h2 class="h2">Record personali</h2><div class="subtitle">I migliori valori effettivamente registrati</div></div>${icon('award',22)}</div>
  <div class="records-list">${records.slice(0,5).map((r,i)=>`<div class="record-row"><span class="record-rank">${i+1}</span><div class="flex-1"><strong>${html(r.name)}</strong><div class="mini muted">${r.sets} serie · ${html(r.muscle)}</div></div><div style="text-align:right"><strong>${r.maxWeight>0?`${pretty(r.maxWeight)} kg`:`${r.maxReps} ${r.unit==='secondi'?'sec':'rip.'}`}</strong><div class="mini muted">${r.estimated1RM?`1RM stimata ${pretty(r.estimated1RM)} kg`:'Senza carico'}</div></div></div>`).join('')}</div></section>
  <section class="section"><div class="section-head"><div><h2 class="h2">Trend per esercizio</h2><div class="subtitle">Ultime 12 sedute registrate</div></div></div><div class="card"><div class="field"><label for="trend-exercise">Esercizio</label><select id="trend-exercise" data-trend-exercise="1">${records.map(r=>`<option value="${html(r.id)}" ${r.id===trendExerciseId?'selected':''}>${html(r.name)}</option>`).join('')}</select></div><div class="trend-tabs">${Object.entries(metrics).map(([key,label])=>`<button class="btn tiny ${trendMetric===key?'active-filter':'secondary'}" type="button" data-action="trend-metric" data-metric="${key}">${label}</button>`).join('')}</div>${renderTrendPlot(trend,trendMetric)}<p class="field-hint">1RM stimata = carico × (1 + ripetizioni / 30), solo per serie fino a 12 ripetizioni. Non è un test massimale reale.</p></div></section>`;
}
function openMoveDialog(dayId){
  const found=workoutById(dayId);if(!found)return;
  const {week,day}=found;
  if(day.completedAt){inform('Riapri prima la sessione completata.');return;}
  const bounds=rescheduleBounds(week,dateISO());
  const value=isoForDay(week,day)<bounds.min?bounds.min:isoForDay(week,day);
  openDialog(`${dialogTop('Sposta allenamento')}<form class="dialog-form" data-form="reschedule" data-day-id="${day.id}" data-week-id="${week.id}"><div class="small muted">${html(day.title)} · ${html(weekLabel(week.start))}</div>${htmlField('Nuova data','scheduledDate',value,{type:'date',min:bounds.min,max:bounds.max})}<p class="field-hint">Scegli un giorno libero. La seduta resta associata alla sua scheda anche se la recuperi nella settimana seguente.</p><div class="dialog-actions"><button class="btn secondary" type="button" data-action="close-dialog">Annulla</button><button class="btn" type="submit">Sposta</button></div></form>`);
}
function openAlternativeDialog(dayId,exId){
  const found=workoutById(dayId);const ex=found&&exerciseById(found.day,exId);if(!ex)return;
  const libraryEx=state.exercises.find(x=>x.id===ex.exerciseId)||{id:ex.exerciseId,muscle:ex.muscle,name:ex.name};
  const alternatives=alternativeExercises(libraryEx,state.exercises);
  openDialog(`${dialogTop('Alternative disponibili')}<div class="small muted">${html(ex.name)} · ${html(ex.muscle)}</div><p class="body">Se un attrezzo è occupato puoi scegliere un esercizio alternativo. I carichi vengono azzerati: adatta il peso al nuovo movimento.</p><div class="stack">${alternatives.map(a=>`<button class="btn secondary full arrow" type="button" data-action="replace-exercise" data-day-id="${html(dayId)}" data-ex-id="${html(exId)}" data-library-id="${html(a.id)}">${html(a.name)} ${icon('arrow',17)}</button>`).join('')}</div><p class="footer-caption">La sostituzione è possibile solo se non hai ancora registrato serie per questo esercizio.</p>`);
}
function openLibraryAddDialog(exId){
  const ex=state.exercises.find(x=>x.id===exId);if(!ex)return;
  const w=getWeek();
  openDialog(`${dialogTop('Aggiungi alla scheda')}<form class="dialog-form" data-form="library-add" data-ex-id="${html(exId)}"><strong>${html(ex.name)}</strong><p class="small muted">Settimana ${html(weekLabel(w.start))}</p><div class="field"><label for="add-to-day">Allenamento</label><select id="add-to-day" name="dayId">${w.days.map(d=>`<option value="${html(d.id)}">${html(d.title)} · ${html(dateLabel(isoForDay(w,d)))}</option>`).join('')}</select></div><p class="field-hint">Serie, ripetizioni e carico saranno modificabili dalla scheda.</p><div class="dialog-actions"><button class="btn secondary" type="button" data-action="close-dialog">Annulla</button><button class="btn" type="submit">Aggiungi</button></div></form>`);
}

function nextGeneration(){
  const latest=latestWeek();
  if(!latest)return;
  const anyLogs=latest.days.some(d=>completedSetCount(d)>0);
  const msg=anyLogs?'Creo una nuova settimana in base alle serie registrate. Potrai modificarla prima di allenarti. Continuare?':'Non ci sono serie registrate: i carichi rimarranno invariati. Vuoi comunque creare la prossima settimana?';
  if(!confirm(msg))return;
  const next=createNextWeek(latest,state.profile,state.exercises,state.weeks);
  if(state.weeks.some(w=>w.start===next.start)){inform('Questa settimana è già presente.');return;}
  state.weeks.push(next);state.weeks.sort((a,b)=>a.start.localeCompare(b.start));selectedWeekStart=next.start;
  persist();go('plan');inform('Nuova scheda pronta: controlla i carichi suggeriti.');
}
function exportBackup(){
  const data={format:'forma-gym-backup',version:1,appVersion:'1.2',exportedAt:new Date().toISOString(),data:structuredClone(state)};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download=`FORMA-backup-${dateISO()}.json`;
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
  state.settings.lastBackupAt=new Date().toISOString();persist();render();inform('Download avviato. Conserva il file in un posto sicuro.');
}
function validateBackup(raw){
  if(!raw||raw.format!=='forma-gym-backup'||raw.version!==1)throw Error('Il file non è un backup FORMA versione 1.');
  const obj=raw.data;
  if(!obj||obj.schemaVersion!==1||!obj.profile||!Array.isArray(obj.weeks)||!Array.isArray(obj.exercises)||!Array.isArray(obj.weightHistory)||!obj.settings)throw Error('Il backup è incompleto.');
  const idOK=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(value);
  const dateOK=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&dateISO(dateFromISO(value))===value;
  const numberOK=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
  const p=obj.profile;
  if(typeof p.firstName!=='string'||!p.firstName.trim()||p.firstName.length>80||typeof p.lastName!=='string'||!p.lastName.trim()||p.lastName.length>80||!numberOK(p.weight,20,400)||!FOCUSES[p.focus]||!Number.isInteger(p.days)||p.days<1||p.days>6)throw Error('Profilo non valido.');
  if(obj.weeks.length<1||obj.weeks.length>400||obj.exercises.length>600||obj.weightHistory.length>3000)throw Error('Il backup supera i limiti supportati o non contiene settimane.');
  for(const exercise of obj.exercises){
    if(!idOK(exercise.id)||typeof exercise.name!=='string'||exercise.name.length>150||typeof exercise.muscle!=='string'||exercise.muscle.length>50||!['base','accessorio'].includes(exercise.kind)||(exercise.unit!==undefined&&!['ripetizioni','secondi'].includes(exercise.unit)))throw Error('Catalogo esercizi non valido.');
  }
  for(const w of obj.weeks){
    if(!idOK(w.id)||!dateOK(w.start)||!Array.isArray(w.days)||w.days.length<1||w.days.length>6)throw Error('Settimane non valide.');
    for(const d of w.days){
      if(!idOK(d.id)||typeof d.title!=='string'||d.title.length>150||!Number.isInteger(d.dayOfWeek)||d.dayOfWeek<0||d.dayOfWeek>6||!Array.isArray(d.exercises)||d.exercises.length>100)throw Error('Allenamento non valido.');
      if(d.completedAt!==null&&d.completedAt!==undefined&&Number.isNaN(Date.parse(d.completedAt)))throw Error('Data di completamento non valida.');
      if(d.scheduledDate!==undefined&&!dateOK(d.scheduledDate))throw Error('Data riprogrammata non valida.');
      for(const ex of d.exercises){
        if(!idOK(ex.id)||!idOK(ex.exerciseId)||typeof ex.name!=='string'||ex.name.length>150||typeof ex.muscle!=='string'||ex.muscle.length>50||!['base','accessorio'].includes(ex.kind)||(ex.unit!==undefined&&!['ripetizioni','secondi'].includes(ex.unit))||!Number.isInteger(ex.setsTarget)||ex.setsTarget<1||ex.setsTarget>8||!Number.isInteger(ex.repMin)||ex.repMin<1||!Number.isInteger(ex.repMax)||ex.repMax<ex.repMin||ex.repMax>999||!numberOK(ex.targetWeight,0,1000)||typeof ex.note!=='string'||ex.note.length>500||typeof ex.insight!=='string'||ex.insight.length>500||!Array.isArray(ex.logs)||ex.logs.length!==ex.setsTarget)throw Error('Esercizi non validi.');
        for(const l of ex.logs){
          if(typeof l.done!=='boolean'||!numberOK(l.weight,0,1000)||(l.reps!==null&&(!Number.isInteger(l.reps)||l.reps<1||l.reps>999))||(l.rir!==null&&(!Number.isInteger(l.rir)||l.rir<0||l.rir>5)))throw Error('Registrazioni non valide.');
        }
      }
    }
  }
  for(const point of obj.weightHistory){if(!dateOK(point.date)||!numberOK(point.kg,20,400))throw Error('Storico pesi non valido.');}
  if(obj.settings.lastBackupAt!==null&&obj.settings.lastBackupAt!==undefined&&Number.isNaN(Date.parse(obj.settings.lastBackupAt)))throw Error('Data di backup non valida.');
  return obj;
}
async function handleImport(file){
  if(!file)return;
  if(file.size>8_000_000)throw Error('Il file supera 8 MB.');
  const raw=JSON.parse(await file.text());
  const imported=validateBackup(raw);
  if(!confirm('Il ripristino SOSTITUIRÀ tutti i dati attuali su questo dispositivo. Ti consigliamo di esportare prima un backup. Continuare?'))return;
  state=imported;ensureLocalSettings();selectedWeekStart=mondayISO();view='home';activeWorkoutId=null;pendingAiProposal=null;aiSelectedKeys=new Set();aiTextDraft='';
  await persist();render();inform('Backup ripristinato correttamente.');
}
async function handleAction(button){
  const action=button.dataset.action;
  if(action==='nav'){go(button.dataset.target);return;}
  if(action==='ai-copy'){await copyAiReport();return;}
  if(action==='ai-download'){downloadAiReport();return;}
  if(action==='ai-open-chatgpt'){
    const opened=window.open('https://chatgpt.com/','_blank','noopener,noreferrer');
    // The address contains no report or personal data.
    if(!opened)inform('Apri manualmente chatgpt.com, quindi incolla il report.');
    return;
  }
  if(action==='ai-preview'){
    const input=document.getElementById('ai-response');
    aiTextDraft=input?.value||'';
    pendingAiProposal=validateAiProposal(aiTextDraft,state);
    aiSelectedKeys=new Set();
    render();
    document.getElementById('ai-preview-section')?.scrollIntoView({behavior:'smooth',block:'start'});
    inform('Proposta verificata: seleziona le modifiche da applicare.');return;
  }
  if(action==='ai-apply'){
    if(!pendingAiProposal)throw Error('Prima importa una proposta valida.');
    const selected=[...aiSelectedKeys];
    if(!selected.length)throw Error('Seleziona almeno una modifica.');
    if(!confirm(`Confermi l'applicazione di ${selected.length} modifiche alla scheda ${pendingAiProposal.proposal.weekStart}? Le registrazioni esistenti non verranno alterate.`))return;
    const result=applyAiChanges(state,pendingAiProposal,selected);
    state=result.nextState;
    await persist();
    pendingAiProposal=null;aiSelectedKeys=new Set();aiTextDraft='';
    selectedWeekStart=result.weekStart;go('plan');inform(`${result.appliedCount} modifiche del coach applicate alla scheda.`);return;
  }
  if(action==='auto-reschedule'){
    const week=state.weeks.find(w=>w.id===button.dataset.weekId);if(!week)return;
    const pending=week.days.filter(d=>!d.completedAt&&isoForDay(week,d)<dateISO()).length;
    if(!pending){inform('Non ci sono allenamenti da recuperare.');return;}
    const proposed=suggestMissedReschedules(state.weeks,week.id,dateISO());
    if(!proposed.length){inform('Non ci sono giorni liberi entro due settimane: sposta manualmente la seduta.');return;}
    const label=proposed.map(p=>{
      const day=week.days.find(d=>d.id===p.dayId);
      return `${day?.title}: ${dateLabel(p.to,{weekday:'long',day:'numeric',month:'short'})}`;
    }).join('\n');
    if(!confirm(`Propongo queste nuove date:\n${label}\n\nConfermi lo spostamento?`))return;
    for(const p of proposed){const day=week.days.find(d=>d.id===p.dayId);if(day)day.scheduledDate=p.to;}
    render();await persist();inform(`${proposed.length} sedute riprogrammate${proposed.length<pending?'; le altre restano in sospeso':''}.`);return;
  }
  if(action==='reschedule-day'){openMoveDialog(button.dataset.dayId);return;}
  if(action==='library-add'){openLibraryAddDialog(button.dataset.exId);return;}
  if(action==='alternatives'){openAlternativeDialog(button.dataset.dayId,button.dataset.exId);return;}
  if(action==='replace-exercise'){
    const found=workoutById(button.dataset.dayId);const old=found&&exerciseById(found.day,button.dataset.exId);
    const replacement=state.exercises.find(x=>x.id===button.dataset.libraryId);
    if(!old||!replacement)return;
    if(old.logs.some(s=>s.done)){inform('Ci sono già serie registrate: aggiungi l’alternativa come nuovo esercizio.');return;}
    const next=makeExercise(replacement,state.profile.focus,{sets:old.setsTarget,min:old.repMin,max:old.repMax,weight:0});
    next.id=old.id;next.note=old.note||'';
    found.day.exercises[found.day.exercises.indexOf(old)]=next;
    closeDialog();render();await persist();inform(`Alternativa inserita: ${replacement.name}.`);return;
  }
  if(action==='trend-metric'){trendMetric=button.dataset.metric;render();return;}
  if(action==='rest-start'){
    startRestTimer(Number(button.dataset.secs)||90);render();await persist();return;
  }
  if(action==='rest-exercise'){
    const found=workoutById(button.dataset.dayId);const ex=found&&exerciseById(found.day,button.dataset.exId);if(!ex)return;
    startRestTimer(restDuration(ex,state.settings.rest),ex.name);render();await persist();return;
  }
  if(action==='rest-dismiss'){state.settings.rest.timer=null;render();await persist();return;}
  if(action==='rest-pause'){
    const timer=getTimer();if(!timer)return;
    timer.pausedRemaining=remainingSeconds(timer);timer.running=false;render();await persist();return;
  }
  if(action==='rest-resume'){
    const timer=getTimer();if(!timer||timer.finished)return;
    unlockAudio();timer.endAt=Date.now()+remainingSeconds(timer)*1000;timer.running=true;render();await persist();return;
  }
  if(action==='rest-plus'){
    const timer=getTimer();if(!timer)return;
    if(timer.finished){startRestTimer(15,timer.exerciseName);}
    else if(timer.running){timer.endAt+=15000;timer.duration+=15;}
    else {timer.pausedRemaining+=15;timer.duration+=15;}
    render();await persist();return;
  }
  if(action==='quick-set'){
    const found=workoutById(button.dataset.dayId);const ex=found&&exerciseById(found.day,button.dataset.exId);
    if(!ex||found.day.completedAt)return;
    const guess=nextQuickSet(ex,found.day.id);
    if(!guess){inform('Hai registrato tutte le serie.');return;}
    const log=ex.logs[guess.index];log.weight=guess.weight;log.reps=guess.reps;log.done=true;
    startRestTimer(restDuration(ex,state.settings.rest),ex.name);
    render();await persist();return;
  }
  if(action==='workout'){setWorkout(button.dataset.id);return;}
  if(action==='back-to-plan'){const found=workoutById(activeWorkoutId);if(found)selectedWeekStart=found.week.start;go('plan');return;}
  if(action==='move-week'){const w=getWeek(),i=state.weeks.indexOf(w),to=state.weeks[i+Number(button.dataset.delta)];if(to){selectedWeekStart=to.start;render();}return;}
  if(action==='generate-next'){nextGeneration();return;}
  if(action==='close-dialog'){closeDialog();return;}
  if(action==='edit-profile'){openProfileDialog();return;}
  if(action==='add-weight'){openWeightDialog();return;}
  if(action==='add-exercise'){openExerciseDialog(button.dataset.dayId);return;}
  if(action==='edit-exercise'){openExerciseDialog(button.dataset.dayId,button.dataset.exId);return;}
  if(action==='delete-exercise'){
    const found=workoutById(button.dataset.dayId);if(!found)return;
    const ex=exerciseById(found.day,button.dataset.exId);if(!ex)return;
    if(!confirm(`Vuoi rimuovere "${ex.name}" da questo giorno?`))return;
    found.day.exercises=found.day.exercises.filter(x=>x.id!==ex.id);
    closeDialog();await persist();render();inform('Esercizio rimosso.');return;
  }
  if(action==='toggle-set'){
    const found=workoutById(button.dataset.dayId);if(!found)return;
    const ex=exerciseById(found.day,button.dataset.exId);if(!ex)return;
    const log=ex.logs[Number(button.dataset.index)];if(!log)return;
    if(!log.done && !(Number(log.reps)>0)){inform('Inserisci prima il numero di ripetizioni.');return;}
    log.done=!log.done;
    if(log.done){
      const next=ex.logs[Number(button.dataset.index)+1];
      if(next&&!next.done){
        if(next.reps===null)next.reps=log.reps;
        if(!next.weight)next.weight=log.weight;
      }
      startRestTimer(restDuration(ex,state.settings.rest),ex.name);
    }
    if(found.day.completedAt)found.day.completedAt=null;
    render();await persist();return;
  }
  if(action==='finish-day'){
    const found=workoutById(button.dataset.id);if(!found)return;
    const count=completedSetCount(found.day);
    if(count===0){inform('Registra almeno una serie per concludere la sessione.');return;}
    if(count<plannedSetCount(found.day)&&!confirm(`Hai segnato ${count} serie su ${plannedSetCount(found.day)}. Concludere comunque?`))return;
    found.day.completedAt=new Date().toISOString();state.settings.rest.timer=null;render();await persist();inform('Allenamento concluso! Ottimo lavoro.');return;
  }
  if(action==='reopen-day'){
    const found=workoutById(button.dataset.id);if(!found)return;
    found.day.completedAt=null;await persist();render();inform('Sessione riaperta.');return;
  }
  if(action==='backup-export'){exportBackup();return;}
  if(action==='backup-import'){backupInput.click();return;}
  if(action==='storage-persist'){
    if(!navigator.storage?.persist){inform('Richiesta non supportata da questo browser.');return;}
    const result=await navigator.storage.persist();
    inform(result?'Memoria persistente autorizzata.':'Il browser non ha autorizzato la memoria persistente. Usa i backup.');return;
  }
  if(action==='reset-app'){
    if(!confirm('Eliminare TUTTI i dati del diario da questo dispositivo? Prima esporta un backup.'))return;
    if(!confirm('Confermi la cancellazione definitiva del diario locale?'))return;
    await pendingSave.catch(()=>{});await eraseState();state=null;timerAlertedEnd=null;selectedWeekStart=null;pendingAiProposal=null;aiSelectedKeys=new Set();aiTextDraft='';view='home';render();inform('Diario locale azzerato.');return;
  }
}
async function handleForm(form){
  const kind=form.dataset.form;
  const fd=new FormData(form);
  if(kind==='rest-settings'){
    const base=Number(fd.get('restBase')),accessory=Number(fd.get('restAccessory'));
    if(![60,75,90,120,150,180].includes(base)||![45,60,75,90,120,150].includes(accessory))throw Error('Valori di recupero non validi.');
    Object.assign(state.settings.rest,{base,accessory,sound:fd.has('restSound'),vibrate:fd.has('restVibrate')});
    render();await persist();inform('Preferenze del timer salvate.');return;
  }
  if(kind==='reschedule'){
    const found=workoutById(form.dataset.dayId);if(!found)throw Error('Sessione non trovata.');
    const target=String(fd.get('scheduledDate'));
    const error=canMoveSession(state.weeks,found.week.id,found.day.id,target,dateISO());
    if(error)throw Error(error);
    found.day.scheduledDate=target;closeDialog();render();await persist();inform('Nuova data salvata nel calendario.');return;
  }
  if(kind==='library-add'){
    const ex=state.exercises.find(x=>x.id===form.dataset.exId);
    const found=workoutById(String(fd.get('dayId')));
    if(!ex||!found)throw Error('Esercizio o allenamento non trovato.');
    if(found.day.exercises.length>=30)throw Error('Limite di 30 esercizi per giornata.');
    if(found.day.completedAt&&!confirm('La sessione è già conclusa. Vuoi riaprirla e aggiungere questo esercizio?'))return;
    found.day.exercises.push(makeExercise(ex,state.profile.focus));found.day.completedAt=null;
    selectedWeekStart=found.week.start;closeDialog();go('plan');await persist();inform('Esercizio aggiunto alla scheda.');return;
  }
  if(kind==='setup'){
    const firstName=String(fd.get('firstName')||'').trim();const lastName=String(fd.get('lastName')||'').trim();
    const weight=Number(fd.get('weight'));const days=Number(fd.get('days'));const focus=String(fd.get('focus'));
    if(!firstName||!lastName||firstName.length>80||lastName.length>80||weight<20||weight>400||!Number.isInteger(days)||days<1||days>6||!FOCUSES[focus])throw Error('Controlla i campi del profilo.');
    const profile={firstName,lastName,weight,days,focus};
    const exercises=defaultExercises();
    state={schemaVersion:1,createdAt:new Date().toISOString(),profile,exercises,
      weeks:[buildWeek(profile,exercises)],weightHistory:[{date:dateISO(),kg:weight}],
      settings:{lastBackupAt:null}};ensureLocalSettings();
    selectedWeekStart=mondayISO();await persist();go('home');inform('Scheda creata e salvata sul telefono!');return;
  }
  if(kind==='edit-profile'){
    const firstName=String(fd.get('firstName')||'').trim();const lastName=String(fd.get('lastName')||'').trim();
    const days=Number(fd.get('days')),focus=String(fd.get('focus'));
    if(!firstName||!lastName||firstName.length>80||lastName.length>80||!Number.isInteger(days)||days<1||days>6||!FOCUSES[focus])throw Error('Dati del profilo non validi.');
    state.profile={...state.profile,firstName,lastName,days,focus};closeDialog();await persist();render();inform('Profilo aggiornato.');return;
  }
  if(kind==='add-weight'){
    const kg=Number(fd.get('weight'));const date=String(fd.get('date'));
    if(!Number.isFinite(kg)||kg<20||kg>400||!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Peso o data non validi.');
    const existing=state.weightHistory.find(p=>p.date===date);
    if(existing)existing.kg=kg;else state.weightHistory.push({date,kg});
    state.weightHistory.sort((a,b)=>a.date.localeCompare(b.date));
    state.profile.weight=state.weightHistory.at(-1).kg;
    closeDialog();await persist();render();inform('Peso registrato.');return;
  }
  if(kind==='exercise'){
    const found=workoutById(form.dataset.dayId);if(!found)throw Error('Sessione non trovata.');
    const old=form.dataset.exId?exerciseById(found.day,form.dataset.exId):null;
    const catalog=String(fd.get('catalog'));
    const sets=Number(fd.get('sets')),min=Number(fd.get('min')),max=Number(fd.get('max')),weight=Number(fd.get('weight'));
    if(!Number.isInteger(sets)||sets<1||sets>8||!Number.isInteger(min)||min<1||!Number.isInteger(max)||max<min||max>999||!Number.isFinite(weight)||weight<0||weight>1000)throw Error('Serie, ripetizioni o carico non validi.');
    let exercise;
    if(catalog==='__custom'){
      const name=String(fd.get('customName')||'').trim().slice(0,150);
      const muscle=String(fd.get('customMuscle')||'Altro').slice(0,30);
      if(!name)throw Error('Inserisci il nome dell’esercizio personale.');
      if(old&&!state.exercises.some(e=>e.id===old.exerciseId)){
        exercise={id:old.exerciseId,name,muscle,kind:'accessorio',unit:String(fd.get('customUnit'))==='secondi'?'secondi':'ripetizioni'};
      } else {
        exercise={id:uniqueId(),name,muscle,kind:'accessorio',unit:String(fd.get('customUnit'))==='secondi'?'secondi':'ripetizioni'};
        state.exercises.push(exercise);
      }
    } else {
      exercise=state.exercises.find(e=>e.id===catalog);
      if(!exercise)throw Error('Esercizio non trovato.');
    }
    const changedExercise=!old||old.exerciseId!==exercise.id;
    const next=changedExercise?makeExercise(exercise,state.profile.focus,{sets,min,max,weight}):{
      ...old,name:exercise.name,muscle:exercise.muscle,kind:exercise.kind,unit:exercise.unit||'ripetizioni',setsTarget:sets,repMin:min,repMax:max,targetWeight:weight,
      logs:Array.from({length:sets},(_,i)=>old.logs[i]??{done:false,weight,reps:null,rir:null}),
    };
    if(changedExercise&&old){next.id=old.id;next.note=old.note||'';next.insight='';}
    if(old){const i=found.day.exercises.indexOf(old);found.day.exercises[i]=next;}else found.day.exercises.push(next);
    if(found.day.completedAt)found.day.completedAt=null;
    closeDialog();await persist();render();inform(old?'Esercizio aggiornato.':'Esercizio aggiunto.');return;
  }
}
root.addEventListener('click',async event=>{
  const button=event.target.closest('button[data-action]');
  if(!button)return;
  try{await handleAction(button);}catch(error){console.error(error);inform(error.message||'Operazione non riuscita.');}
});
dialog.addEventListener('close',()=>{dialog.innerHTML='';});
dialog.addEventListener('click',async event=>{
  const button=event.target.closest('button[data-action]');if(!button)return;
  try{await handleAction(button);}catch(error){console.error(error);inform(error.message||'Operazione non riuscita.');}
});
dialog.addEventListener('change',event=>{if(event.target.matches('[name=catalog]'))updateCustomExerciseFields();});
document.addEventListener('submit',async event=>{
  const form=event.target.closest('form[data-form]');if(!form)return;
  event.preventDefault();
  const submit=form.querySelector('button[type=submit]');if(submit)submit.disabled=true;
  try{await handleForm(form);}catch(error){console.error(error);inform(error.message||'Controlla i dati inseriti.');}
  finally{if(submit?.isConnected)submit.disabled=false;}
});
root.addEventListener('change',async event=>{
  const input=event.target;
  if(input.dataset.aiSelect!==undefined){
    if(input.checked)aiSelectedKeys.add(input.dataset.aiSelect);else aiSelectedKeys.delete(input.dataset.aiSelect);
    const counter=document.getElementById('ai-selected-count');if(counter&&pendingAiProposal)counter.textContent=`${aiSelectedKeys.size} selezionate su ${pendingAiProposal.previews.length}`;
    const apply=root.querySelector('[data-action="ai-apply"]');if(apply)apply.disabled=!aiSelectedKeys.size;
    return;
  }
  if(input.dataset.aiOption){
    if(input.dataset.aiOption==='weeks')aiReportWeeks=Number(input.value);
    if(input.dataset.aiOption==='weight')aiIncludeWeight=input.checked;
    if(input.dataset.aiOption==='notes')aiIncludeNotes=input.checked;
    return;
  }
  if(input.dataset.libraryMuscle){libraryMuscle=input.value;document.getElementById('library-results').innerHTML=libraryResults();document.getElementById('library-count').textContent=`${filteredLibrary().length} esercizi`;return;}
  if(input.dataset.trendExercise){trendExerciseId=input.value;render();return;}
  if(input.dataset.logField){
    const found=workoutById(input.dataset.dayId);if(!found)return;
    const ex=exerciseById(found.day,input.dataset.exId);if(!ex)return;
    const set=ex.logs[Number(input.dataset.index)];if(!set)return;
    const field=input.dataset.logField;
    if(field==='rir')set.rir=input.value===''?null:Number(input.value);
    else if(field==='weight'){
      const value=input.value===''?0:Number(input.value);
      if(!Number.isFinite(value)||value<0||value>1000){inform('Carico non valido.');input.value=set.weight||'';return;}
      set.weight=value;
    } else if(field==='reps'){
      const value=input.value===''?null:Number(input.value);
      if(value!==null&&(!Number.isInteger(value)||value<1||value>999)){inform('Ripetizioni non valide.');input.value=set.reps??'';return;}
      set.reps=value;if(value===null)set.done=false;
    }
    if(found.day.completedAt)found.day.completedAt=null;
    await persist();return;
  }
  if(input.dataset.note){
    const found=workoutById(input.dataset.dayId);if(!found)return;
    const ex=exerciseById(found.day,input.dataset.exId);if(!ex)return;
    ex.note=String(input.value).slice(0,500);await persist();
  }
});
root.addEventListener('input',event=>{
  if(event.target.id==='ai-response'){
    aiTextDraft=event.target.value;
    if(pendingAiProposal){pendingAiProposal=null;aiSelectedKeys=new Set();document.getElementById('ai-preview-section')?.remove();}
    return;
  }
  if(event.target.dataset.librarySearch){
    libraryTerm=event.target.value;
    const results=document.getElementById('library-results');const count=document.getElementById('library-count');
    if(results&&count){results.innerHTML=libraryResults();count.textContent=`${filteredLibrary().length} esercizi`;}
  }
});
window.setInterval(tickRestTimer,1000);
document.addEventListener('visibilitychange',tickRestTimer);
backupInput.addEventListener('change',async ()=>{
  try{await handleImport(backupInput.files?.[0]);}catch(error){console.error(error);inform(error instanceof SyntaxError?'Il file JSON non è valido.':error.message||'Importazione non riuscita.');}
  finally{backupInput.value='';}
});

(async()=>{
  try{
    const existing=await loadState();
    if(existing){
      if(existing.schemaVersion!==1||!existing.profile||!Array.isArray(existing.weeks))throw Error('Database non compatibile con questa versione.');
      state=existing;
      state.settings ||= {lastBackupAt:null};
      state.weightHistory ||= [{date:dateISO(),kg:state.profile.weight}];
      state.exercises ||= defaultExercises();
      state.weeks.sort((a,b)=>a.start.localeCompare(b.start));
      ensureLocalSettings();
    }
    selectedWeekStart=mondayISO();render();
    if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')){
      navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Cache offline non disponibile',err));
    }
  }catch(error){
    console.error(error);
    root.innerHTML=`<div class="error-screen"><h2>Non riesco ad aprire il diario</h2><p>${html(error.message||'Controlla le impostazioni del browser.')}</p><p>Se il browser blocca IndexedDB (per esempio in modalità privata), apri l'app in una scheda normale.</p></div>`;
  }
})();
