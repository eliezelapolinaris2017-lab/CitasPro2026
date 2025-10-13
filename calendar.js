// Calendario con badges de cantidad de citas por día
// renderCalendar(container, selectedDate, onPick, getCount)
// - container: elemento o id del contenedor
// - selectedDate: Date inicial seleccionada
// - onPick: callback(Date) cuando el usuario hace click en un día
// - getCount: fn(yyyy-mm-dd) -> number de citas en ese día
function renderCalendar(container, selectedDate, onPick, getCount){
  const root = (typeof container === 'string') ? document.getElementById(container) : container;
  if(!root) return;
  root.innerHTML = '';

  const d = selectedDate ? new Date(selectedDate) : new Date();
  const year = d.getFullYear(); 
  const month = d.getMonth();

  const first = new Date(year, month, 1);
  const start = new Date(first); 
  // Lunes como primer día (ISO): ajusta desde el lunes anterior
  start.setDate(first.getDate() - ((first.getDay()+6)%7));

  const days = ['L','M','X','J','V','S','D'];
  days.forEach(x=>{
    const e = document.createElement('div'); 
    e.textContent = x; 
    e.className = 'dow'; 
    root.appendChild(e);
  });

  for(let i=0;i<42;i++){
    const cur = new Date(start); 
    cur.setDate(start.getDate()+i);
    const div = document.createElement('div'); 
    div.className = 'day';
    div.textContent = cur.getDate();

    const isToday = (cur.toDateString() === new Date().toDateString());
    if(isToday) div.classList.add('today');

    if(cur.getMonth() !== month) div.classList.add('dim');

    const isSelected = selectedDate && (cur.toDateString() === new Date(selectedDate).toDateString());
    if(isSelected) div.classList.add('selected');

    // Badge de cantidad de citas
    const ymd = cur.toISOString().slice(0,10);
    try{
      const n = typeof getCount === 'function' ? (getCount(ymd)|0) : 0;
      if(n > 0){
        const b = document.createElement('span');
        b.className = 'cal-badge';
        b.textContent = n;
        div.appendChild(b);
      }
    }catch(e){/* ignore */ }

    div.onclick = ()=> onPick && onPick(cur);
    root.appendChild(div);
  }
}
