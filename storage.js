const Storage = {
  key: 'citaspro.db',
  isBackend: false, // pon true si usas el backend Java
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
    return db;
  },
  _save(db){ localStorage.setItem(this.key, JSON.stringify(db)); },

  ensureDemoAdmin(){ const db = this._db(); if(!db.user) db.user={email:'admin@example.com', pass:'admin'}; this._save(db); },

  async login(email, pass){
    if(this.isBackend){
      const r = await fetch(this.BASE_URL+'/api/login',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email, pass})});
      return r.ok;
    } else {
      const db = this._db();
      return email===db.user.email && pass===db.user.pass;
    }
  },

  saveAppointment(appt){
    const db = this._db();
    appt.id = crypto.randomUUID();
    appt.date = (appt.date || '').slice(0,10);
    appt.time = (appt.time || '').slice(0,5);
    db.appointments.push(appt);
    this._save(db);
    return appt;
  },
  listAppointments(){
    const db = this._db();
    return db.appointments.slice().sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  },

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

  ensureVipToken(){ const db=this._db(); if(!db.settings.vipToken){ db.settings.vipToken = crypto.randomUUID(); this._save(db);} return db.settings.vipToken; },
  validateVip(token){ const db=this._db(); return !!token && token===db.settings.vipToken; },

  async fileToDataUrl(file){
    return await new Promise(res=>{ const fr = new FileReader(); fr.onload=()=>res(fr.result); fr.readAsDataURL(file); });
  },

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
