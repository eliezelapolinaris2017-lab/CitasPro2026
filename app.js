(function(){
  // ===== Helpers =====
  function fmtDateShort(iso){ 
    // iso: YYYY-MM-DD -> DD/MM/YY
    if(!iso || iso.length < 10) return iso || '';
    const [y,m,d] = iso.slice(0,10).split('-');
    return `${d}/${m}/${y.slice(2)}`;
  }

  document.addEventListener('DOMContentLoaded', ()=> {
    Storage.bootstrapUI();
    wireLoginDemo();
    wireDashboard();
    wireVip();
  });

  // -------- Login (index.html) --------
  function wireLoginDemo(){
    const form = document.getElementById('loginForm');
    const btnDemo = document.getElementById('btnDemo');
    if(!form && !btnDemo) return;

    if(form){
      form.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const email = (document.getElementById('email')||{}).value?.trim();
        const pass  = (document.getElementById('password')||{}).value?.trim();
        const ok = await Storage.login(email, pass);
        if(ok){ location.href='dashboard.html'; }
        else { alert('Credenciales inválidas. Usa admin@example.com / admin'); }
      });
    }
    if(btnDemo){
      btnDemo.onclick = ()=>{ Storage.ensureDemoAdmin(); location.href = 'dashboard.html'; };
    }
  }

  // -------- Panel (dashboard.html) --------
  function wireDashboard(){
    const isDashboard = !!document.getElementById('appointments');
    if(!isDashboard) return;

    // Branding inicial
    Storage.applyBranding();

    // Color
    const themeColor = document.getElementById('themeColor');
    if(themeColor){
      themeColor.value = Storage.getThemeColor();
      themeColor.oninput = ()=> Storage.setThemeColor(themeColor.value);
    }

    // WhatsApp template (persistente)
    const waTemplate = document.getElementById('waTemplate');
    if(waTemplate){
      waTemplate.value = Storage.getWhatsAppTemplate();
      waTemplate.addEventListener('input', ()=> Storage.setWhatsAppTemplate(waTemplate.value));
      waTemplate.addEventListener('change', ()=> Storage.setWhatsAppTemplate(waTemplate.value));
    }

    // VIP token
    const vipToken = document.getElementById('vipToken');
    const btnGenVip = document.getElementById('btnGenVip');
    const btnShareVip = document.getElementById('btnShareVip');
    if(vipToken){ vipToken.value = Storage.ensureVipToken(); }
    if(btnGenVip){ btnGenVip.onclick = ()=>{ vipToken.value = Storage.ensureVipToken(); alert('Token generado'); }; }
    if(btnShareVip){
      btnShareVip.onclick = async ()=>{
        const url = new URL(location.origin + location.pathname.replace('dashboard.html','vip.html'));
        url.searchParams.set('t', Storage.ensureVipToken());
        try{ await navigator.clipboard.writeText(url.toString()); alert('Enlace VIP copiado: ' + url); }
        catch{ alert('Tu enlace VIP: ' + url); }
      };
    }

    // Logo y fondo (persisten como dataURL)
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

    // Calendario + formulario
    const cal = document.getElementById('calendar');
    const appointmentForm = document.getElementById('appointmentForm');
    const dateEl = document.getElementById('date');
    const dayList = document.getElementById('dayList');
    const allList = document.getElementById('appointments');

    let selected = new Date();
    if(dateEl) dateEl.valueAsDate = selected;

    // Dibuja calendario con contador de citas por día
    function drawCalendar(){
      if(!cal) return;
      const getCount = (ymd)=> Storage.listAppointments().filter(a=>a.date===ymd).length;
      renderCalendar(
        cal,
        selected,
        (d)=>{ selected = d; if(dateEl){ dateEl.valueAsDate = d; } refreshLists(); drawCalendar(); }, // al seleccionar, refresca y redibuja
        getCount
      );
    }
    drawCalendar();

    if(appointmentForm){
      appointmentForm.addEventListener('submit', (e)=>{
        e.preventDefault();
        const appt = {
          name: document.getElementById('clientName').value.trim(),
          phone: document.getElementById('clientPhone').value.trim(),
          service: document.getElementById('service').value.trim(),
          price: Number(document.getElementById('price').value||0),
          date: (document.getElementById('date').value || '').slice(0,10),
          time: (document.getElementById('time').value || '').slice(0,5),
          duration: Number(document.getElementById('duration').value||60),
          source: 'admin'
        };
        Storage.saveAppointment(appt);
        appointmentForm.reset();
        if(dateEl) dateEl.valueAsDate = selected;
        refreshLists();
        drawCalendar(); // <- redibuja para actualizar badges
      });
    }

    function refreshLists(){
      const dd = (dateEl && dateEl.value) ? dateEl.value.slice(0,10) : new Date().toISOString().slice(0,10);
      const all = Storage.listAppointments();
      const today = all.filter(a => a.date === dd);

      if(dayList){
        // Lista del día: solo hora
        dayList.innerHTML = today.map(renderItemDay).join('') || '<p class="muted">No hay citas.</p>';
      }
      if(allList){
        // Mis Citas (todas): fecha corta + hora
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
          <div class="tags"><span class="tag">${a.duration}m</span><span class="tag">$${a.price}</span>${a.source==='vip'?'<span class="tag">VIP</span>':''}</div>
        </div>
        <div class="row"><a class="btn ghost" target="_blank" href="${wa}">WhatsApp</a></div>
      </div>`;
    }

    function renderItemAll(a){
      const msg = Storage.getWhatsAppTemplate()
        .replace('{{nombre}}', a.name)
        .replace('{{fecha}}', a.date) // cámbialo por fmtDateShort(a.date) si quieres fecha corta en el texto de WA
        .replace('{{hora}}', a.time)
        .replace('{{servicio}}', a.service)
        .replace('{{precio}}', a.price);
      const wa = `https://wa.me/${encodeURIComponent(a.phone)}?text=${encodeURIComponent(msg)}`;
      const fechaHora = `${fmtDateShort(a.date)} ${a.time}`;
      return `<div class="item">
        <div>
          <strong>${fechaHora}</strong> — ${a.name} · ${a.service}
          <div class="tags"><span class="tag">${a.duration}m</span><span class="tag">$${a.price}</span>${a.source==='vip'?'<span class="tag">VIP</span>':''}</div>
        </div>
        <div class="row"><a class="btn ghost" target="_blank" href="${wa}">WhatsApp</a></div>
      </div>`;
    }

    // primera carga
    refreshLists();

    // salir
    const btnLogout = document.getElementById('btnLogout');
    if(btnLogout){ btnLogout.onclick = ()=> location.href='index.html'; }
  }

  // -------- VIP (vip.html) --------
  function wireVip(){
    const isVip = !!document.getElementById('vipForm');
    if(!isVip) return;

    Storage.applyBranding();

    const cal = document.getElementById('calendar');
    let selected = new Date();
    renderCalendar(cal, selected, (d)=>{ selected = d; const vipDate = document.getElementById('vipDate'); if(vipDate) vipDate.valueAsDate = d; }, 
      (ymd)=> Storage.listAppointments().filter(a=>a.date===ymd).length
    );
    const vipDate = document.getElementById('vipDate'); if(vipDate) vipDate.valueAsDate = selected;

    const form = document.getElementById('vipForm');
    const q = new URLSearchParams(location.search);
    const token = q.get('t');
    if(!Storage.validateVip(token)){
      document.body.innerHTML = '<main class="card"><h2>Enlace inválido</h2><p>Pide un enlace válido a tu negocio.</p></main>';
      return;
    }

    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const appt = {
        name: document.getElementById('vipName').value.trim(),
        phone: document.getElementById('vipPhone').value.trim(),
        service: document.getElementById('vipService').value.trim(),
        date: (document.getElementById('vipDate').value || '').slice(0,10),
        time: (document.getElementById('vipTime').value || '').slice(0,5),
        duration: Number(document.getElementById('vipDuration').value||60),
        price: 0,
        source: 'vip'
      };
      Storage.saveAppointment(appt);
      const msg = document.getElementById('vipMsg');
      if(msg) msg.textContent = '¡Listo! Tu cita quedó registrada.';
      form.reset();
      // Opcional: redibujar calendario VIP para ver el contador
      renderCalendar(cal, selected, (d)=>{ selected=d; const vd=document.getElementById('vipDate'); if(vd) vd.valueAsDate=d; }, 
        (ymd)=> Storage.listAppointments().filter(a=>a.date===ymd).length
      );
    });
  }
})();
