// Analisi, record e calendario. Nessuna rete: dati esclusivamente in memoria/IndexedDB.
import { dateISO, dateFromISO, weekEndISO } from './planner.js';

export function plusDays(iso, n) {
  const date = dateFromISO(iso);
  date.setDate(date.getDate() + n);
  return dateISO(date);
}
export function validISO(iso) {
  return typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso) && dateISO(dateFromISO(iso)) === iso;
}
export function plannedDate(week, day) {
  if (validISO(day.scheduledDate)) return day.scheduledDate;
  const start = dateFromISO(week.start);
  start.setDate(start.getDate() + ((day.dayOfWeek + 6) % 7));
  return dateISO(start);
}
export function actualDayDate(day) {
  return day.completedAt && !Number.isNaN(Date.parse(day.completedAt))
    ? dateISO(new Date(day.completedAt)) : null;
}
export function sessionEntries(weeks) {
  return weeks.flatMap(week => week.days.map(day => ({
    week, day, date: actualDayDate(day)||plannedDate(week,day), actualDate: actualDayDate(day),
  }))).sort((a,b) => a.date.localeCompare(b.date));
}
export function rescheduleBounds(week, today=dateISO()) {
  const max = plusDays(weekEndISO(week.start),14);
  return {min:today, max:max<plusDays(today,14) ? plusDays(today,14) : max};
}
export function canMoveSession(weeks, weekId, dayId, target, today=dateISO()) {
  const week=weeks.find(w=>w.id===weekId);
  const day=week?.days.find(d=>d.id===dayId);
  if(!week||!day) return 'Sessione non trovata.';
  if(day.completedAt) return 'Riapri prima la sessione completata.';
  if(!validISO(target))return 'Scegli una data valida.';
  const {min,max}=rescheduleBounds(week,today);
  if(target<min||target>max)return `La data deve essere tra ${min} e ${max}.`;
  const taken=sessionEntries(weeks).some(x=>x.day.id!==dayId && x.date===target);
  if(taken)return 'Esiste già un allenamento programmato per questo giorno.';
  return null;
}
// Restituisce proposte, senza alterare gli oggetti. Non cancella o duplica sessioni.
export function suggestMissedReschedules(weeks, selectedWeekId, today=dateISO(), daysAhead=14) {
  const week=weeks.find(w=>w.id===selectedWeekId);
  if(!week)return [];
  const scheduled=sessionEntries(weeks);
  const occupied=new Set(scheduled.filter(x=>!(x.week.id===selectedWeekId && !x.day.completedAt && x.date<today)).map(x=>x.date));
  const missing=scheduled.filter(x=>x.week.id===selectedWeekId && !x.day.completedAt && x.date<today);
  const result=[];
  const bounds=rescheduleBounds(week,today);
  for(const entry of missing) {
    let target=null;
    // Per schede da 1-3 giorni, preferisci un giorno di riposo fra due sedute.
    // Se non c'è spazio sufficiente, usa comunque il primo giorno libero.
    for(const avoidAdjacent of (week.days.length<=3?[true,false]:[false])) {
      for(let i=0;i<daysAhead;i++) {
        const candidate=plusDays(today,i);
        if(candidate>bounds.max || occupied.has(candidate))continue;
        if(avoidAdjacent && (occupied.has(plusDays(candidate,-1)) || occupied.has(plusDays(candidate,1))))continue;
        target=candidate;break;
      }
      if(target)break;
    }
    if(target){occupied.add(target);result.push({weekId:week.id,dayId:entry.day.id,from:entry.date,to:target});}
  }
  return result;
}
export function exerciseSessions(weeks, exerciseId) {
  return weeks.flatMap(week => week.days.flatMap(day => day.exercises
    .filter(ex=>ex.exerciseId===exerciseId && ex.logs.some(s=>s.done && Number(s.reps)>0))
    .map(ex=>({date:actualDayDate(day)||plannedDate(week,day),weekStart:week.start,
      dayId:day.id, exId:ex.id, name:ex.name, unit:ex.unit||'ripetizioni',
      targetWeight:ex.targetWeight, setsTarget:ex.setsTarget,repMin:ex.repMin,repMax:ex.repMax,
      logs:ex.logs.filter(s=>s.done && Number(s.reps)>0)}))))
    .sort((a,b)=>a.date.localeCompare(b.date)||a.weekStart.localeCompare(b.weekStart));
}
export function sessionMetrics(session) {
  const valid=session.logs.filter(s=>s.done && Number(s.reps)>0);
  const weighted=valid.filter(s=>Number(s.weight)>0);
  const maxWeight=weighted.length?Math.max(...weighted.map(s=>Number(s.weight))):0;
  const totalVolume=weighted.reduce((sum,s)=>sum+Number(s.weight)*Number(s.reps),0);
  const estimated1RM=weighted.filter(s=>Number(s.reps)<=12 && session.unit!=='secondi')
    .reduce((best,s)=>Math.max(best,Number(s.weight)*(1+Number(s.reps)/30)),0);
  return {maxWeight,totalVolume,estimated1RM,sets:valid.length,
    maxReps:valid.length?Math.max(...valid.map(s=>Number(s.reps))):0};
}
export function exerciseTrend(weeks,id,metric='maxWeight') {
  if(!['maxWeight','totalVolume','estimated1RM'].includes(metric))metric='maxWeight';
  return exerciseSessions(weeks,id).map(s=>({...sessionMetrics(s),date:s.date,name:s.name}));
}
export function personalRecords(weeks,exercises) {
  return exercises.map(ex=>{
    const sessions=exerciseSessions(weeks,ex.id);
    const all=sessions.map(s=>({...sessionMetrics(s),date:s.date}));
    return {id:ex.id,name:ex.name,muscle:ex.muscle,unit:ex.unit||'ripetizioni',
      sessions:sessions.length,sets:all.reduce((a,x)=>a+x.sets,0),
      maxWeight:Math.max(0,...all.map(x=>x.maxWeight)),
      estimated1RM:Math.max(0,...all.map(x=>x.estimated1RM)),
      maxReps:Math.max(0,...all.map(x=>x.maxReps)),
      totalVolume:all.reduce((a,x)=>a+x.totalVolume,0)};
  }).filter(x=>x.sets>0).sort((a,b)=>b.estimated1RM-a.estimated1RM || b.totalVolume-a.totalVolume);
}
export function lastExerciseSession(weeks, exerciseId, excludeDayId=null) {
  return exerciseSessions(weeks,exerciseId).filter(s=>s.dayId!==excludeDayId).at(-1)||null;
}
export function restDuration(ex,settings) {
  const defaultSeconds=ex.kind==='base'?120:75;
  const value=Number(ex.kind==='base'?settings?.base:settings?.accessory);
  return Number.isInteger(value)&&value>=15&&value<=600?value:defaultSeconds;
}
