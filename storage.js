const Storage = {
  key: 'citaspro.db',
  isBackend: false,
  BASE_URL: 'http://localhost:4567',

  _db(){
    const db = JSON.parse(localStorage.getItem(this.key) || '{}');
    db.user = db.user || { email: 'admin@example.com', pass: 'admin' };
    db.appointments = db.appointments || [];
    db.settings = db.settings || {};
    db.settings.themeColor = db.settings.themeColor || db.themeColor || '#ff4d5a';
    db.settings.wa = db.settings.wa || db.wa || 'Hola {{nombre}}, tu cita es el {{fecha}} a las {{hora}} por {{servicio}}. Precio: ${{precio}}.';
    db.settings.logo = db.settings.logo || db.logo || null;
    db.settings.bg = db.settings.bg || db.bg || null;
    db.settings.vipToken = db.settings.vipToken || (db.vip && db.vip.token) || null;
    db.settings.employees = db.settings.employees || ['Empleado 1','Empleado 2'];
    return db;
  },
  _save(db){ localStorage.setItem(this.key, JSON.stringify(db)); },

  // Auth
  async login(email, pass){
    if(this.isBackend){
      const r = await fetch(this.BASE_URL+'/api/login',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email, pass})});
      return r.ok;
    } else {
      const db = this._db();
      return email===db.user.email && pass===db.user.pass;
    }
  },

  // Empleados
  ensureEmployees(){ const db=this._db(); if(!db.settings.employees.length) db.settings.employees=['Empleado 1','Empleado 2']; this._save(db); },
  getEmployees(){ return this._db().settings.employees.slice(); },
  addEmployee(name){ const db=this._db(); db.settings.employees.push(name); this._save(db); },
  renameEmployee(oldN,newN){
    const db=this._db();
    db.settings.employees = db.settings.employees.map(e=>e===oldN?newN:e);
    db.appointments.forEach(a=>{ if(a.employee===oldN) a.employee=newN; });
    this._save(db);
  },
  deleteEmployee(name){
    const db=this._db();
    db.settings.employees = db.settings.employees.filter(e=>e!==name);
    this._save(db);
  },

  // Citas
  getAppointment(id){ return this._db().appointments.find(a=>a.id===id); },
  saveAppointment(appt){
    const db = this._db();
    appt.id = appt.id || crypto.randomUUID();
    appt.date = (appt.date || '').slice(0,10);
    appt.time = (appt.time || '').slice(0,5);
    db.appointments.push(appt);
    this._save(db);
    return appt;
  },
  saveOrUpdateAppointment(appt){
    const db = this._db();
    appt.date = (appt.date || '').slice(0,10);
    appt.time = (appt.time || '').slice(0,5);
    if(appt.id){
      const i = db.appointments.findIndex(x=>x.id===appt.id);
      if(i>=0) db.appointments[i]=appt; else db.appointments.push(appt);
    }else{
      appt.id = crypto.randomUUID();
      db.appointments.push(appt);
    }
    this._save(db);
    return appt;
  },
  listAppointments(){
    const db = this._db();
    return db.appointments.slice().sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  },

  // Choques por empleado (intervalos)
  canSchedule(appt){
    const db = this._db();
    const sameDay = db.appointments.filter(a => 
      a.date === appt.date &&
      (a.employee||'') === (appt.employee||'') &&
      a.id !== appt.id // si estás editando, ignora la misma cita
    );
    if(sameDay.length === 0) return true;
    const start = toMinutes(appt.time);
    const end   = start + (Number(appt.duration)||60);
    return !sameDay.some(a=>{
      const s = toMinutes(a.time);
      const e = s + (Number(a.duration)||60);
      return Math.max(start, s) < Math.min(end, e); // se solapa
    });
    function toMinutes(hhmm){ const [h,m]=(hhmm||'00:00').split(':').map(Number); return h*60 + (m||0); }
  },

  // Branding + WA
  getThemeColor(){ return this._db().settings.themeColor; },
  setThemeColor(hex){ const db=this._db(); db.settings.themeColor=hex; this._save(db); this.applyBranding(); },

  getLogo(){ return this._db().settings.logo || null; },
  setLogo(dataUrl){ const db=this._db(); db.settings.logo=dataUrl; this._save(db); this.applyBranding(); },

  getBackground(){ return this._db().settings.bg || null; },
  setBackground(dataUrl){ const db=this._db(); db.settings.bg=dataUrl; this._save(db); this.applyBranding(); },

  getWhatsAppTemplate(){ return this._db().settings.wa; },
  setWhatsAppTemplate(t){
    const db = this._db();
    db.settings.wa = t && t.trim()
      ? t
      : 'Hola {{nombre}}, tu cita es el {{fecha}} a las {{hora}} por {{servicio}}. Precio: ${{precio}}.';
    this._save(db);
    const el = document.getElementById('waTemplate');
    if(el && el.value !== db.settings.wa) el.value = db.settings.wa;
  },

  // VIP
  ensureVipToken(){ const db=this._db(); if(!db.settings.vipToken){ db.settings.vipToken = crypto.randomUUID(); this._save(db);} return db.settings.vipToken; },
  validateVip(token){ const db=this._db(); return !!token && token===db.settings.vipToken; },

  // Utils
  async fileToDataUrl(file){ return await new Promise(res=>{ const fr = new FileReader(); fr.onload=()=>res(fr.result); fr.readAsDataURL(file); }); },
  applyBranding(){
    const db = this._db();
    try{ document.documentElement.style.setProperty('--brand', db.settings.themeColor || '#ff4d5a'); }catch(e){}
    try{ const logoEl=document.getElementById('brandLogo'); if(logoEl && db.settings.logo){ logoEl.src=db.settings.logo; } }catch(e){}
    try{
      if(db.settings.bg){
        document.body.style.backgroundImage = `url(${db.settings.bg})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundAttachment = 'fixed';
      } else { document.body.style.backgroundImage=''; }
    }catch(e){}
  },
  bootstrapUI(){ this.applyBranding(); }
};
