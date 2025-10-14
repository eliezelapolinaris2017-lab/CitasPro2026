(function(){
  // Helpers
  function fmtDateShort(iso){ 
    if(!iso || iso.length < 10) return iso || '';
    const [y,m,d] = iso.slice(0,10).split('-');
    return `${d}/${m}/${y.slice(2)}`;
  }

  // namespace seguro para handlers globales
  window.App = window.App || {};

  document.addEventListener('DOMContentLoaded', ()=> {
    Storage.bootstrapUI();
    wireLogin();
    wireDashboard();
    wireSettings();
    wireVip();
  });

  // --- Login ---
  function wireLogin(){
    const form = document.getElementById('loginForm');
    if(!form) return;
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const pass  = document.getElementById('password').value.trim();
      const ok = await Storage.login(email, pass);
      if(ok) location.href='dashboard.html';
      else alert('Credenciales inválidas. Usa admin@example.com / admin');
    });
  }

  // --- Dashboard: crear/editar citas ---
  function wireDashboard(){
    const isDashboard = !!document.getElementById('appointments');
    if(!isDashboard) return;

    Storage.applyBranding();

    // Elements
    const cal = document.getElementById('calendar');
    const form = document.getElementById('appointmentForm');
    const idEl = document.getElementById('apptId');
    const nameEl = document.getElementById('clientName');
    const phoneEl = document.getElementById('clientPhone');
    const serviceEl = document.getElementById('service');
    const priceEl = document.getElementById('price');
    const dateEl = document.getElementById('date');
    const timeEl = document.getElementById('time');
    const durationEl = document.getElementById('duration');
    const empSel = document.getElementById('employee');
    const notesEl = document.getElementById('notes');
    const btnCancel = document.getElementById('btnCancelEdit');
    const btnSave = document.getElementById('btnSave');

    const dayList = document.getElementById('dayList');
    const allList = document.getElementById('appointments');

    // Empleados dinámicos
    Storage.ensureEmployees();
    if (empSel) {
      empSel.innerHTML = Storage.getEmployees().map(e=>`<option>${e}</option>`).join('');
    }

    // Estado de calendario
    let viewDate = new Date();
    let selected = new Date();
    if(dateEl) dateEl.valueAsDate = selected;

    function labelMonthES(d){
      return d.toLocaleDateString('es-ES', { month:'long', year:'numeric' }).replace(/^\w/, c=>c.toUpperCase());
    }

    function drawCalendar(){
      const getCount = (ymd)=> Storage.listAppointments().filter(a=>a.date===ymd).length;
      renderCalendar(cal, viewDate, (d)=>{
        selected = d;
        if(dateEl) dateEl.valueAsDate = d;
        refresh();
        drawCalendar();
      }, getCount, selected);
      const lab = document.getElementById('calLabel');
      if(lab) lab.textContent = labelMonthES(viewDate);
    }

    const prev = document.getElementById('calPrev');
    const next = document.getElementById('calNext');
    if(prev) prev.onclick = ()=>{ viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()-1, 1); drawCalendar(); };
    if(next) next.onclick = ()=>{ viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 1); drawCalendar(); };

    drawCalendar();

    // Guardar / actualizar
    form.addEventListener('submit',(e)=>{
      e.preventDefault();
      const appt = {
        id: idEl.value || null,
        name: nameEl.value.trim(),
        phone: phoneEl.value.trim(),
        service: serviceEl.value.trim(),
        employee: empSel.value,
        notes: (notesEl.value||'').trim(),
        price: Number(priceEl.value||0),
        date: (dateEl.value||'').slice(0,10),
        time: (timeEl.value||'').slice(0,5),
        duration: Number(durationEl.value||60),
        source: 'admin'
      };
      if(!Storage.canSchedule(appt)){
        alert('Ese horario ya está ocupado para ' + appt.employee + '. Elige otra hora o empleado.');
        return;
      }
      Storage.saveOrUpdateAppointment(appt);
      resetEdit();
      refresh(); drawCalendar();
    });

    function refresh(){
      const dd=(dateEl && dateEl.value) ? dateEl.value.slice(0,10) : new Date().toISOString().slice(0,10);
      const all = Storage.listAppointments();
      const today = all.filter(a=>a.date===dd);

      dayList.innerHTML = today.map(renderItem).join('') || '<p class="muted">No hay citas.</p>';
      allList.innerHTML = all.map(renderItem).join('') || '<p class="muted">Aún sin citas.</p>';
    }

    function renderItem(a){
      const msg = Storage.getWhatsAppTemplate()
        .replace('{{nombre}}', a.name)
        .replace('{{fecha}}', a.date)
        .replace('{{hora}}', a.time)
        .replace('{{servicio}}', a.service)
        .replace('{{precio}}', a.price);
      const wa = `https://wa.me/${encodeURIComponent(a.phone)}?text=${encodeURIComponent(msg)}`;
      const fechaHora = `${fmtDateShort(a.date)} ${a.time}`;
      return `<div class="item">
        <div>
          <strong>${fechaHora}</strong> — ${a.name} · ${a.service}
          <div class="tags">
            <span class="tag">${a.employee||'—'}</span>
            <span class="tag">${a.duration}m</span>
            <span class="tag">$${a.price}</span>
            ${a.source==='vip'?'<span class="tag">VIP</span>':''}
          </div>
        </div>
        <div class="row">
          <a class="btn ghost" target="_blank" href="${wa}">WhatsApp</a>
          <button class="btn" onclick="App.editAppointment('${a.id}')">✏️</button>
        </div>
      </div>`;
    }

    // Exponer handler global seguro para los botones de edición
    window.App.editAppointment = (id)=>{
      const a = Storage.getAppointment(id); if(!a) return;
      idEl.value = a.id;
      nameEl.value = a.name;
      phoneEl.value = a.phone;
      serviceEl.value = a.service;
      priceEl.value = a.price;
      dateEl.value = a.date;
      timeEl.value = a.time;
      durationEl.value = a.duration;
      notesEl.value = a.notes || '';
      if (empSel && a.employee) empSel.value = a.employee;
      btnSave.textContent = 'Actualizar cita';
      btnCancel.style.display = 'inline-block';
      nameEl.focus();
    };

    function resetEdit(){
      form.reset();
      idEl.value = '';
      btnSave.textContent = 'Guardar cita';
      btnCancel.style.display = 'none';
      dateEl.valueAsDate = selected;
    }
    btnCancel.addEventListener('click', resetEdit);

    refresh();

    const btnLogout = document.getElementById('btnLogout');
    if(btnLogout){ btnLogout.onclick = ()=> location.href='index.html'; }
  }

  // --- Settings (marca, WA, VIP y empleados) ---
  function wireSettings(){
    const tc = document.getElementById('themeColor');
    if(!tc) return;

    Storage.applyBranding();

    // Color
    tc.value = Storage.getThemeColor();
    tc.oninput = ()=> Storage.setThemeColor(tc.value);

    // Logo/fondo
    const logoInput = document.getElementById('logoInput');
    if(logoInput){
      logoInput.onchange = async (e)=>{
        const f = e.target.files?.[0]; if(!f) return;
        const dataUrl = await Storage.fileToDataUrl(f);
        Storage.setLogo(dataUrl);
      };
    }
    const bgInput = document.getElementById('bgInput');
    if(bgInput){
      bgInput.onchange = async (e)=>{
        const f = e.target.files?.[0]; if(!f) return;
        const dataUrl = await Storage.fileToDataUrl(f);
        Storage.setBackground(dataUrl);
      };
    }

    // WhatsApp template
    const waTemplate = document.getElementById('waTemplate');
    waTemplate.value = Storage.getWhatsAppTemplate();
    waTemplate.addEventListener('input', ()=> Storage.setWhatsAppTemplate(waTemplate.value));
    waTemplate.addEventListener('change', ()=> Storage.setWhatsAppTemplate(waTemplate.value));

    // VIP
    const vipToken = document.getElementById('vipToken');
    const btnGenVip = document.getElementById('btnGenVip');
    const btnShareVip = document.getElementById('btnShareVip');
    const preview = document.getElementById('vipLinkPreview');
    const renderPreview = ()=>{
      const url = new URL('vip.html', location.href);
      url.searchParams.set('t', Storage.ensureVipToken());
      if(preview) preview.textContent = url.toString();
    };
    if(vipToken){ vipToken.value = Storage.ensureVipToken(); }
    renderPreview();
    if(btnGenVip){
      btnGenVip.onclick = ()=>{ 
        vipToken.value = Storage.ensureVipToken(); 
        alert('Token generado'); 
        renderPreview(); 
      };
    }
    if(btnShareVip){
      btnShareVip.onclick = async ()=>{
        const url = new URL('vip.html', location.href);
        url.searchParams.set('t', Storage.ensureVipToken());
        renderPreview();
        try { await navigator.clipboard.writeText(url.toString()); alert('Enlace VIP copiado: ' + url); }
        catch { alert('Tu enlace VIP: ' + url); }
      };
    }

    // Gestión de empleados
    Storage.ensureEmployees();
    const empList=document.getElementById('empList');
    const addEmp=document.getElementById('addEmp');
    const newEmp=document.getElementById('newEmp');

    const renderEmp=()=>{
      empList.innerHTML=Storage.getEmployees().map(e=>`
        <div class="row">
          <span>${e}</span>
          <button class="btn" onclick="App.renameEmployee('${e.replace(/'/g,"\\'")}')">✏️</button>
          <button class="btn" onclick="App.removeEmployee('${e.replace(/'/g,"\\'")}')">🗑️</button>
        </div>`).join('');
    };

    // Exponer handlers globales seguros
    window.App.renameEmployee = (oldN)=>{
      const nn=prompt('Nuevo nombre para '+oldN,oldN);
      if(nn&&nn.trim()){Storage.renameEmployee(oldN,nn.trim()); renderEmp();}
    };
    window.App.removeEmployee = (n)=>{
      if(confirm('Eliminar '+n+'?')){ Storage.deleteEmployee(n); renderEmp(); }
    };

    addEmp.onclick=()=>{
      const v=newEmp.value.trim();
      if(v){ Storage.addEmployee(v); newEmp.value=''; renderEmp(); }
    };

    renderEmp();
  }

  // --- VIP (solo validación; resto en vip.html inline) ---
  function wireVip(){
    const isVip = !!document.getElementById('vipForm');
    if(!isVip) return;

    Storage.applyBranding();

    const q = new URLSearchParams(location.search);
    const token = q.get('t');
    if(!Storage.validateVip(token)){
      document.body.innerHTML = '<main class="card"><h2>Enlace inválido</h2><p>Pide un enlace válido a tu negocio.</p><p><a class="btn" href="index.html">Ir al inicio</a></p></main>';
      return;
    }
  }
})();
