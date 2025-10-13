(function(){


const form = document.getElementById('appointmentForm');
if(form){
form.addEventListener('submit', (e)=>{
e.preventDefault();
const appt = {
name: clientName.value.trim(),
phone: clientPhone.value.trim(),
service: service.value.trim(),
price: Number(price.value||0),
date: date.value,
time: time.value,
duration: Number(duration.value||60),
source: 'admin'
};
Storage.saveAppointment(appt);
form.reset();
date.valueAsDate = new Date();
refreshDay();
});
}


// Personalización UI
const themeColor = document.getElementById('themeColor');
if(themeColor){
themeColor.value = Storage.getThemeColor();
document.documentElement.style.setProperty('--brand', themeColor.value);
themeColor.oninput = () => Storage.setThemeColor(themeColor.value);
}
const logoInput = document.getElementById('logoInput');
if(logoInput){ logoInput.onchange = e=> toDataUrl(e.target.files[0]).then(Storage.setLogo.bind(Storage)); }
const bgInput = document.getElementById('bgInput');
if(bgInput){ bgInput.onchange = e=> toDataUrl(e.target.files[0]).then(Storage.setBackground.bind(Storage)); }


const waTemplate = document.getElementById('waTemplate');
if(waTemplate){ waTemplate.value = Storage.getWhatsAppTemplate(); waTemplate.oninput = ()=> Storage.setWhatsAppTemplate(waTemplate.value); }


const btnGenVip = document.getElementById('btnGenVip');
const vipToken = document.getElementById('vipToken');
const btnShareVip = document.getElementById('btnShareVip');
if(vipToken){ vipToken.value = Storage.ensureVipToken(); }
if(btnGenVip){ btnGenVip.onclick = ()=>{ vipToken.value = Storage.ensureVipToken(); alert('Token generado'); } }
if(btnShareVip){ btnShareVip.onclick = ()=>{
const url = new URL(location.origin + location.pathname.replace('dashboard.html','vip.html'));
url.searchParams.set('t', Storage.ensureVipToken());
navigator.clipboard.writeText(url.toString());
alert('Enlace VIP copiado: '+ url);
} }


const btnLogout = document.getElementById('btnLogout');
if(btnLogout){ btnLogout.onclick = ()=>{ location.href='index.html'; } }


function toDataUrl(file){
return new Promise((res)=>{ const fr = new FileReader(); fr.onload = ()=> res(fr.result); fr.readAsDataURL(file); });
}
})();
