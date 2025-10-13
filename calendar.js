// Calendario con badges de cantidad de citas por día
// renderCalendar(container, displayDate, onPick, getCount, selectedDateForHighlight?)
// - displayDate: Date que define el mes visible
// - selectedDateForHighlight: Date a resaltar
function renderCalendar(container, displayDate, onPick, getCount, selectedDateForHighlight){
  const root = (typeof container === 'string') ? document.getElementById(container) : container;
  if(!root) return;
  root.innerHTML = '';

  const d = displayDate ? new Date(displayDate) : new Date();
  const year = d.getFullYear(); 
  const month = d.getMonth();

  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay()+6)%7)); // lunes

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

    if(cur.toDateString() === new Date().toDateString()) div.classList.add('today');
    if(cur.getMonth() !== month) div.classList.add('dim');
    if(selectedDateForHighlight && cur.toDateString() === new Date(selectedDateForHighlight).toDateString()){
      div.classList.add('selected');
    }

    const ymd = cur.toISOString().slice(0,10);
    try{
      const n = typeof getCount === 'function' ? (getCount(ymd)|0) : 0;
      if(n > 0){
        const b = document.createElement('span');
        b.className = 'cal-badge';
        b.textContent = n;
        div.appendChild(b);
      }
    }catch(e){}

    div.onclick = ()=> onPick && onPick(cur);
    root.appendChild(div);
  }
}
