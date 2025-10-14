(function(){
  function fmtDateShort(iso){ 
    if(!iso || iso.length < 10) return iso || '';
    const [y,m,d] = iso.slice(0,10).split('-');
    return `${d}/${m}/${y.slice(2)}`;
  }

  document.addEventListener('DOMContentLoaded', ()=> {
    Storage.bootstrapUI();
    wireLogin();
    wireDashboard();
    wireSettings();
    wireVip();
  });

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

  function wireDashboard(){
    const isDashboard = !!document.getElementById('appointments');
    if(!isDashboard) return;

    Storage.applyBranding();

    const cal = document.getElementById('calendar');
    const appointmentForm = document.getElementById('appointmentForm');
    const dateEl = document.getElementById('date');
    const dayList = document.getElementById('dayList');
    const allList = document.getElementById('appointments');

    let viewDate = new Date();
    let selected = new Date();
    if(dateEl) dateEl.valueAsDate = selected;

    function labelMonthES(d){
      return d.toLocaleDateString('es-ES', { month:'long', year:'numeric' })
              .replace(/^\w/, c=>c.toUpperCase());
    }

    function drawCalendar(){
      const getCount = (ymd)=> Storage.listAppointments().filter(a=>a.date===ymd).length;
      renderCalendar(cal, viewDate, (d)=>{
        selected = d;
        if(dateEl) dateEl.valueAsDate = d;
        refreshLists();
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

    if(appointmentForm){
      appointmentForm.addEventListener('submit', (e)=>{
        e.preventDefault();
        const appt = {
          name: document.getElementById('clientName').value.trim(),
          phone: document.getElementById('clientPhone').value.trim(),
          service: document.getElementById('service').value.trim(),
          employee: document.getElementById('employee').value,
          notes: (document.getElementById('notes').value||'').trim(),
          price: Number(document.getElementById('price').value||0),
          date: (document.getElementById('date').value || '').slice(0,10),
          time: (document.getElementById('time').value || '').slice(0,5),
          duration: Number(document.getElementById('duration').value||60),
          source: 'admin'
        };

        // Validar choque por empleado
        if(!Storage.canSchedule(appt)){
          alert('Ese horario ya está ocupado para ' + appt.employee + '. Elige otra hora o empleado.');
          return;
        }

        Storage.saveAppointment(appt);
        appointmentForm.reset();
        if(dateEl) dateEl.valueAsDate = selected;
        refreshLists();
        drawCalendar();
      });
    }

    function refreshLists(){
      const dd = (dateEl && dateEl.value) ? dateEl.value.slice(0,10) : new Date().toISOString().slice(0,10);
      const all = Storage.listAppointments();
      const today = all.filter(a => a.date === dd);

      if(dayList){
        dayList.innerHTML = today.map(renderItemDay).join('') || '<p class="muted">No hay citas.</p>';
      }
      if(allList){
        allList.innerHTML = all.map(renderItemAll).join('') || '<p class="muted">Aún sin citas.</p>';
      }
    }

    function renderItemDay(a){
      const msg = Storage.getWhatsAppTemplate()
        .replace('{{nombre}}', a.name)
        .replace('{{fecha}}', a.date)
        .replace('{{hora}}', a.time)
        .replace('{{servicio}}', a.service)
        .replace('{{precio}}', a.price);
      const wa = `https://wa.me/${encodeURIComponent(a.phone)}?text=${encodeURIComponent(msg)}`;
      return `<div class="item">
        <div>
          <strong>${a.time}</strong> — ${a.name} · ${a.service}
          <div class="tags">
            <span class="tag">${a.duration}m</span>
            <span class="tag">$${a.price}</span>
            <span class="tag">${a.employee||'—'}</span>
            ${a.source==='vip'?'<span class="tag">VIP</span>':''}
          </div>
        </div>
        <div class="row"><a class="btn ghost" target="_blank" href="${wa}">WhatsApp</a></div>
      </div>`;
    }

    function renderItemAll(a){
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
            <span class="tag">${a.duration}m</span>
            <span class="tag">$${a.price}</span>
            <span class="tag">${a.employee||'—'}</span>
            ${a.source==='vip'?'<span class="tag">VIP</span>':''}
          </div>
        </div>
        <div class="row"><a class="btn ghost" target="_blank" href="${wa}">WhatsApp</a></div>
      </div>`;
    }

    refreshLists();

    const btnLogout = document.getElementById('btnLogout');
    if(btnLogout){ btnLogout.onclick = ()=> location.href='index.html'; }
  }

  function wireSettings(){
    const tc = document.getElementById('themeColor');
    if(!tc) return;

    Storage.applyBranding();

    tc.value = Storage.getThemeColor();
    tc.oninput = ()=> Storage.setThemeColor(tc.value);

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

    const waTemplate = document.getElementById('waTemplate');
    waTemplate.value = Storage.getWhatsAppTemplate();
    waTemplate.addEventListener('input', ()=> Storage.setWhatsAppTemplate(waTemplate.value));
    waTemplate.addEventListener('change', ()=> Storage.setWhatsAppTemplate(waTemplate.value));

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
        try {
          await navigator.clipboard.writeText(url.toString());
          alert('Enlace VIP copiado: ' + url);
        } catch {
          alert('Tu enlace VIP: ' + url);
        }
      };
    }
  }

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

    const cal = document.getElementById('calendar');
    let selected = new Date();
    renderCalendar(cal, selected, (d)=>{ selected = d; const vipDate = document.getElementById('vipDate'); if(vipDate) vipDate.valueAsDate = d; },
      (ymd)=> Storage.listAppointments().filter(a=>a.date===ymd).length
    );
    const vipDate = document.getElementById('vipDate'); 
    if(vipDate) vipDate.valueAsDate = selected;

    const form = document.getElementById('vipForm');
    const msgBox = document.getElementById('vipMsg');
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const appt = {
        name: document.getElementById('vipName').value.trim(),
        phone: document.getElementById('vipPhone').value.trim(),
        service: document.getElementById('vipService').value.trim(),
        employee: document.getElementById('vipEmployee').value,
        date: (document.getElementById('vipDate').value || '').slice(0,10),
        time: (document.getElementById('vipTime').value || '').slice(0,5),
        duration: Number(document.getElementById('vipDuration').value||60),
        price: 0,
        source: 'vip'
      };

      if(!Storage.canSchedule(appt)){
        alert('Ese horario ya está ocupado para ' + appt.employee + '. Elige otra hora o empleado.');
        return;
      }

      Storage.saveAppointment(appt);
      if(msgBox) msg.textContent = '¡Listo! Tu cita quedó registrada.';
      form.reset();
    });
  }
})();
