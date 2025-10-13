const Storage = {
isBackend: false, // cambia a true si montas el backend Java y ajusta BASE_URL
BASE_URL: 'http://localhost:4567',


async login(email, pass){
if(this.isBackend){
const r = await fetch(this.BASE_URL+'/api/login',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email, pass})});
return r.ok;
} else {
const db = JSON.parse(localStorage.getItem('citaspro.db')||'{}');
const user = db.user || {email:'admin@example.com', pass:'admin'};
return (email===user.email && pass===user.pass);
}
},


ensureDemoAdmin(){
const db = JSON.parse(localStorage.getItem('citaspro.db')||'{}');
if(!db.user){ db.user={email:'admin@example.com', pass:'admin'}; localStorage.setItem('citaspro.db', JSON.stringify(db)); }
},


saveAppointment(appt){
const db = JSON.parse(localStorage.getItem('citaspro.db')||'{}');
db.appointments = db.appointments || [];
appt.id = crypto.randomUUID();
db.appointments.push(appt);
localStorage.setItem('citaspro.db', JSON.stringify(db));
return appt;
},
listAppointments(){
const db = JSON.parse(localStorage.getItem('citaspro.db')||'{}');
return db.appointments||[];
},


setThemeColor(hex){ document.documentElement.style.setProperty('--brand', hex); const db=this._db(); db.themeColor=hex; this._save(db); },
getThemeColor(){ return this._db().themeColor || '#ff4d5a'; },


setLogo(dataUrl){ const db=this._db(); db.logo=dataUrl; this._save(db); document.getElementById('brandLogo').src=dataUrl; },
setBackground(dataUrl){ const db=this._db(); db.bg=dataUrl; this._save(db); document.body.style.backgroundImage=`url(${dataUrl})`; },


getLogo(){ return this._db().logo; },
getBackground(){ return this._db().bg; },


setWhatsAppTemplate(t){ const db=this._db(); db.wa=t; this._save(db); },
getWhatsAppTemplate(){ return this._db().wa || 'Hola {{nombre}}, tu cita es el {{fecha}} a las {{hora}} por {{servicio}}.'; },


ensureVipToken(){ const db=this._db(); if(!db.vip){ db.vip={token: crypto.randomUUID()}; this._save(db);} return db.vip.token; },
validateVip(token){ const db=this._db(); return token && db.vip && token===db.vip.token; },


_db(){ return JSON.parse(localStorage.getItem('citaspro.db')||'{}'); },
_save(db){ localStorage.setItem('citaspro.db', JSON.stringify(db)); }
};
