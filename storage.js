const Storage = {
  key: 'citaspro.db',

  _db(){
    const db = JSON.parse(localStorage.getItem(this.key) || '{}');
    db.user = db.user || { email: 'admin@example.com', pass: 'admin' };
    db.appointments = db.appointments || [];
    db.settings = db.settings || {};
    db.settings.themeColor = db.settings.themeColor || '#ff4d5a';
    db.settings.wa = db.settings.wa || 'Hola {{nombre}}, tu cita es el {{fecha}} a las {{hora}} por {{servicio}}. Precio: ${{precio}}.';
    db.settings.logo = db.settings.logo || null;
    db.settings.bg = db.settings.bg || null;
    db.settings.vipToken = db.settings.vipToken || null;
    db.settings.employees = db.settings.employees || ['Empleado 1', 'Empleado 2'];

    // 🔗 Google Calendar - Webhook preconfigurado
    const DEFAULT_WEBHOOK = 'https://script.google.com/macros/s/AKfycbxJLYRkVnvC1TANR0lJJ30wAB9bhQP-7p7UMfK6BRxpOVuDzqwD5BeB2nLd8T0Ivs7f7Q/exec';
    db.settings.gcal = db.settings.gcal || { enabled:true, webhook: DEFAULT_WEBHOOK };
    if (!db.settings.gcal.webhook) db.settings.gcal.webhook = DEFAULT_WEBHOOK;

    return db;
  },
  _save(db){ localStorage.setItem(this.key, JSON.stringify(db)); },

  // 🔐 Login
  async login(email, pass){
    const db = this._db();
    return email === db.user.email && pass === db.user.pass;
  },

  // 🧠 Google Calendar Config
  getGCal(){ return this._db().settings.gcal || { enabled:true, webhook:'' }; },
  setGCalWebhook(url){
    const db=this._db();
    db.settings.gcal.webhook = (url||'').trim();
    this._save(db);
  },
  setGCalEnabled(on){
    const db=this._db();
    db.settings.gcal.enabled = !!on;
    this._save(db);
  },
  setGoogleEventId(localId, eventId){
    const db=this._db();
    const i=db.appointments.findIndex(a=>a.id===localId);
    if(i>=0){ db.appointments[i].googleEventId = eventId; this._save(db); }
  },

  // 👥 Empleados
  ensureEmployees(){ const db=this._db(); if(!db.settings.employees.length) db.settings.employees=['Empleado 1','Empleado 2']; this._save(db); },
  getEmployees(){ return this._db().settings.employees.slice(); },
  addEmployee(name){ const db=this._db(); db.settings.employees.push(name); this._save(db); },
  renameEmployee(oldN,newN){ const db=this._db(); db.settings.employees=db.settings.employees.map(e=>e===oldN?newN:e); db.appointments.forEach(a=>{if(a.employee===oldN)a.employee=newN;}); this._save(db); },
  deleteEmployee(name){ const db=this._db(); db.settings.employees=db.settings.employees.filter(e=>e!==name); this._save(db); },

  // 📅 Citas
  getAppointment(id){ return this._db().appointments.find(a=>a.id===id); },
  saveOrUpdateAppointment(appt){
    const db = this._db();
    appt.id = appt.id || crypto.randomUUID();
    appt.date = (appt.date||'').slice(0,10);
    appt.time = (appt.time||'').slice(0,5);
    const i=db.appointments.findIndex(x=>x.id===appt.id);
    if(i>=0) db.appointments[i]=appt; else db.appointments.push(appt);
    this._save(db);
    return appt;
  },
  saveAppointment(appt){ return this.saveOrUpdateAppointment(appt); },
  listAppointments(){
    const db=this._db();
    return db.appointments.slice().sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  },
  canSchedule(appt){
    const db=this._db();
    const sameDay=db.appointments.filter(a=>a.date===appt.date&&(a.employee||'')===appt.employee&&a.id!==appt.id);
    if(sameDay.length===0) return true;
    const toMin=s=>{const[h,m]=(s||'00:00').split(':').map(Number);return h*60+m;};
    const s1=toMin(appt.time), e1=s1+(+appt.duration||60);
    return !sameDay.some(a=>{
      const s2=toMin(a.time), e2=s2+(+a.duration||60);
      return Math.max(s1,s2)<Math.min(e1,e2);
    });
  },

  // 🎨 Branding
  getThemeColor(){return this._db().settings.themeColor;},
  setThemeColor(c){const db=this._db();db.settings.themeColor=c;this._save(db);this.applyBranding();},
  getLogo(){return this._db().settings.logo;},
  setLogo(d){const db=this._db();db.settings.logo=d;this._save(db);this.applyBranding();},
  getBackground(){return this._db().settings.bg;},
  setBackground(d){const db=this._db();db.settings.bg=d;this._save(db);this.applyBranding();},
  getWhatsAppTemplate(){return this._db().settings.wa;},
  setWhatsAppTemplate(t){const db=this._db();db.settings.wa=t.trim()?t:'Hola {{nombre}}, tu cita es el {{fecha}} a las {{hora}} por {{servicio}}. Precio: ${{precio}}.';this._save(db);},

  // 🌟 VIP
  ensureVipToken(){const db=this._db();if(!db.settings.vipToken){db.settings.vipToken=crypto.randomUUID();this._save(db);}return db.settings.vipToken;},
  validateVip(t){return !!t && t===this._db().settings.vipToken;},

  async fileToDataUrl(f){return await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(f);});},
  applyBranding(){
    const db=this._db();
    document.documentElement.style.setProperty('--brand',db.settings.themeColor||'#ff4d5a');
    const logo=document.getElementById('brandLogo');
    if(logo && db.settings.logo) logo.src=db.settings.logo;
    if(db.settings.bg){
      document.body.style.backgroundImage=`url(${db.settings.bg})`;
      document.body.style.backgroundSize='cover';
      document.body.style.backgroundAttachment='fixed';
    } else document.body.style.backgroundImage='';
  },
  bootstrapUI(){this.applyBranding();}
};

window.AppStorage = Storage;
