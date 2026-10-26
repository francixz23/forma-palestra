// Suggerimenti generali, consultabili senza connessione e senza fotografie da terzi.
const GUIDES={
 'squat':['Controlla la discesa, mantieni il piede stabile e risali senza perdere la posizione.','goblet','pressa'],
 'goblet':['Tieni il peso vicino al petto, scendi in modo controllato e mantieni il busto stabile.','squat','pressa'],
 'pressa':['Regola il sedile, mantieni il bacino appoggiato ed evita di rimbalzare in fondo.','goblet','affondi'],
 'stacco-rumeno':['Spingi il bacino all’indietro con il carico vicino alle gambe e la schiena stabile.','leg-curl','affondi'],
 'affondi':['Esegui passi controllati e mantieni l’equilibrio durante entrambe le fasi.','pressa','goblet'],
 'leg-curl':['Regola l’attrezzo sulla tua statura ed evita di muovere il bacino.','stacco-rumeno'],
 'leg-extension':['Esegui l’estensione senza slanci, con un’escursione confortevole.','pressa'],
 'calf':['Usa un movimento completo e controllato di caviglia, senza rimbalzi.','pressa'],
 'panca':['Piedi ben appoggiati, scapole stabili e traiettoria controllata.','chest-press','panca-inclinata'],
 'panca-inclinata':['Mantieni gli avambracci stabili e controlla la discesa dei manubri.','chest-press','panca'],
 'chest-press':['Regola altezza e seduta, spingi senza perdere contatto con lo schienale.','panca','panca-inclinata'],
 'croci':['Mantieni una leggera flessione dei gomiti e muovi le braccia senza slanci.','chest-press'],
 'lat':['Porta la barra verso la parte alta del petto, senza dondolare con il busto.','trazioni','pulley'],
 'trazioni':['Controlla la discesa e regola l’assistenza per mantenere la tecnica.','lat','pulley'],
 'rematore':['Mantieni il tronco stabile e tira il gomito verso il fianco senza ruotare.','pulley','lat'],
 'pulley':['Tieni il busto stabile e tira la maniglia verso l’addome.','rematore','lat'],
 'pullover':['Mantieni le braccia quasi distese e concentra il movimento sulle spalle.','lat','pulley'],
 'military':['Spingi sopra la testa mantenendo il tronco stabile, senza inarcare troppo.','alzate'],
 'alzate':['Sollevamento laterale controllato, senza slancio del busto.','military'],
 'reverse-fly':['Allarga le braccia con controllo, evitando di alzare le spalle.','rematore','alzate'],
 'curl':['Tieni i gomiti abbastanza fermi e controlla la fase di discesa.','curl-bil'],
 'curl-bil':['Evita di oscillare con il tronco e controlla la discesa.','curl'],
 'pushdown':['Mantieni i gomiti vicini al corpo ed estendi senza slancio.','french'],
 'french':['Mantieni i gomiti controllati e usa un carico che consenta movimento fluido.','pushdown'],
 'plank':['Mantieni il tronco stabile, respira normalmente ed evita di cedere con il bacino.','dead-bug'],
 'crunch':['Fletti il tronco con controllo ed evita di tirare con le braccia.','dead-bug','plank'],
 'dead-bug':['Muovi arti opposti lentamente, mantenendo la zona lombare stabile.','plank','crunch'],
};
export const MUSCLES=['Tutti','Gambe','Petto','Schiena','Spalle','Bicipiti','Tricipiti','Core','Cardio','Altro'];
export function getExerciseGuide(ex) {
  const entry=GUIDES[ex.id];
  if(entry)return {tip:entry[0],alternatives:entry.slice(1)};
  return {tip:'Mantieni il movimento sotto controllo, scegli un carico gestibile e interrompi in caso di dolore.',alternatives:[]};
}
export function alternativeExercises(ex,library){
  const byId=new Map(library.map(x=>[x.id,x]));
  const ids=getExerciseGuide(ex).alternatives;
  const selected=ids.map(id=>byId.get(id)).filter(Boolean);
  return selected.length?selected:library.filter(x=>x.muscle===ex.muscle && x.id!==ex.id).slice(0,3);
}
