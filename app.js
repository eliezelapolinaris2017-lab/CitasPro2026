(function(){
  function fmtDateShort(iso){ if(!iso)return ''; const[y,m,d]=iso.slice(0,10).split('-'); return `${d}/${m}/${y.slice(2)}`; }
  window.App = {};

  document.addEventListener('DOMContentLoaded', ()=>{
    Storage.bootstrapUI();
    wireSettings();
    wireDashboard();
  });

  // ⚙️ CONFIGURACIÓN
  function wireSettings(){
    const tc=document.getElementById('themeColor'); if(!tc)return;
    Storage.applyBranding();

    // Tema
    tc.value=Storage.getThemeColor(); tc.oninput=()=>Storage.setThemeColor(tc.value);

    // Logo/Fondo
    ['logoInput','bgInput'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.onchange=async e=>{
        const f=e.target.files?.[0]; if(!f)return;
        const data=await Storage.fileToDataUrl(f);
        id==='logoInput'?Storage.setLogo(data):Storage.setBackground(data);
      };
    });

    // WhatsApp
    const wa=document.getElementById('waTemplate'); if(wa){ wa.value=Storage.getWhatsAppTemplate(); wa.oninput=()=>Storage.setWhatsAppTemplate(wa.value); }

    // VIP
    const vip=document.getElementById('vipToken'), gen=document.getElementById('btnGenVip'), share=document.getElementById('btnShareVip'), prev=document.getElementById('vipLinkPreview');
    const renderPreview=()=>{const u=new URL('vip.html',location.href);u.searchParams.set('t',Storage.ensureVipToken());if(prev)prev.textContent=u.toString();};
    if(vip)vip.value=Storage.ensureVipToken();renderPreview();
    if(gen)gen.onclick=()=>{vip.value=Storage.ensureVipToken();alert('Token generado');renderPreview();};
    if(share)share.onclick=async()=>{const u=new URL('vip.html',location.href);u.searchParams.set('t',Storage.ensureVipToken());renderPreview();await navigator.clipboard.writeText(u.toString());alert('Copiado: '+u);};

    // Google Calendar
    const w=document.getElementById('gcalWebhook'), chk=document.getElementById('gcalEnabled'), cfg=Storage.getGCal();
    if(w) w.value=cfg.webhook||'';
    if(chk) chk.checked=!!cfg.enabled;
    if(w) w.onchange=()=>Storage.setGCalWebhook(w.value);
    if(chk) chk.onchange=()=>Storage.setGCalEnabled(chk.checked);

    // Empleados
    Storage.ensureEmployees();
    const list=document.getElementById('empList'); const add=document.getElementById('addEmp'); const inp=document.getElementById('newEmp');
    const render=()=>{list.innerHTML=Storage.getEmployees().map(e=>`<div class='row'><span>${e}</span><button class='btn' onclick="App.renameEmployee('${e}')">✏️</button><button class='btn' onclick="App.removeEmployee('${e}')">🗑️</button></div>`).join('');};
    App.renameEmployee=n=>{const nn=prompt('Nuevo nombre para '+n,n);if(nn&&nn.trim()){Storage.renameEmployee(n,nn.trim());render();}};
    App.removeEmployee=n=>{if(confirm('Eliminar '+n+'?')){Storage.deleteEmployee(n);render();}};
    if(add)add.onclick=()=>{if(inp.value.trim()){Storage.addEmployee(inp.value.trim());inp.value='';render();}};
    render();
  }

  // 📅 DASHBOARD
  function wireDashboard(){
    const form=document.getElementById('appointmentForm'); if(!form)return;
    Storage.applyBranding(); Storage.ensureEmployees();
    const empSel=document.getElementById('employee'); empSel.innerHTML=Storage.getEmployees().map(e=>`<option>${e}</option>`).join('');

    const date=document.getElementById('date'); date.valueAsDate=new Date();
    const list=document.getElementById('appointments');
    const idEl=document.getElementById('apptId'), saveBtn=document.getElementById('btnSave'), cancel=document.getElementById('btnCancelEdit');
    const refresh=()=>{list.innerHTML=Storage.listAppointments().map(a=>{
      const msg=Storage.getWhatsAppTemplate().replace('{{nombre}}',a.name).replace('{{fecha}}',a.date).replace('{{hora}}',a.time).replace('{{servicio}}',a.service).replace('{{precio}}',a.price);
      const wa=`https://wa.me/${encodeURIComponent(a.phone)}?text=${encodeURIComponent(msg)}`;
      return `<div class='item'><div><strong>${fmtDateShort(a.date)} ${a.time}</strong> — ${a.name}<div class='tags'><span class='tag'>${a.employee}</span>${a.googleEventId?'<span class="tag">Google ✓</span>':''}</div></div><div class='row'><a class='btn ghost' target='_blank' href='${wa}'>WhatsApp</a><button class='btn' onclick="App.editAppointment('${a.id}')">✏️</button></div></div>`;
    }).join('')||'<p class="muted">Sin citas.</p>';};

    form.onsubmit=async e=>{
      e.preventDefault();
      const appt={
        id:idEl.value||null,
        name:clientName.value.trim(),
        phone:clientPhone.value.trim(),
        service:service.value.trim(),
        employee:employee.value,
        price:Number(price.value||0),
        date:date.value.slice(0,10),
        time:time.value.slice(0,5),
        duration:Number(duration.value||60),
        notes:notes.value.trim(),
        source:'admin'
      };
      if(!Storage.canSchedule(appt)){alert('Choque de horario para '+appt.employee);return;}
      Storage.saveOrUpdateAppointment(appt);
      await pushToGoogleCalendar(appt);
      reset(); refresh();
    };

    App.editAppointment=id=>{
      const a=Storage.getAppointment(id); if(!a)return;
      idEl.value=a.id; clientName.value=a.name; clientPhone.value=a.phone; service.value=a.service; price.value=a.price; date.value=a.date; time.value=a.time; duration.value=a.duration; notes.value=a.notes||''; employee.value=a.employee;
      saveBtn.textContent='Actualizar cita'; cancel.style.display='inline-block';
    };
    const reset=()=>{form.reset();idEl.value='';saveBtn.textContent='Guardar cita';cancel.style.display='none';date.valueAsDate=new Date();};
    cancel.onclick=reset;
    refresh();
  }

  // 🚀 Enviar cita al Google Calendar
  async function pushToGoogleCalendar(appt){
    const cfg=Storage.getGCal(); if(!cfg.enabled||!cfg.webhook) return;
    const payload={ action:appt.googleEventId?'update':'create', appt, eventId:appt.googleEventId||null };
    try{
      const r=await fetch(cfg.webhook,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const data=await r.json(); if(data.ok&&data.eventId) Storage.setGoogleEventId(appt.id,data.eventId);
    }catch(err){ console.warn('Google Calendar error:',err); }
  }

  window.AppPush = pushToGoogleCalendar; // disponible para VIP
})();
