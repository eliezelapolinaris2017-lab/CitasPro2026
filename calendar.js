const Calendar = {
render(containerId, onSelect){
const el = document.getElementById(containerId) || (typeof containerId==='string'?document.getElementById(containerId):containerId);
},
};


// versión simple para este proyecto
function renderCalendar(container, selectedDate, onPick){
const root = (typeof container === 'string')?document.getElementById(container):container;
root.innerHTML = '';
const d = selectedDate ? new Date(selectedDate) : new Date();
const year = d.getFullYear(); const month = d.getMonth();
const first = new Date(year, month, 1);
const start = new Date(first); start.setDate(first.getDate() - ((first.getDay()+6)%7));
const days = ['L','M','X','J','V','S','D'];
days.forEach(x=>{ const e=document.createElement('div'); e.textContent=x; e.className='dow'; root.appendChild(e);});
for(let i=0;i<42;i++){
const cur = new Date(start); cur.setDate(start.getDate()+i);
const div = document.createElement('div'); div.className='day';
div.textContent = cur.getDate();
if(cur.toDateString()===new Date().toDateString()) div.classList.add('today');
div.onclick = ()=> onPick(cur);
root.appendChild(div);
}
}
