const BUILDINGS = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII'];
const seed = {};
BUILDINGS.forEach((roman, index) => {
  const active = index >= 10;
  seed[roman] = {
    name: `Plenitude ${roman}`,
    units: Array.from({length: 6}, (_, n) => ({
      code: `${Math.floor(n / 3) + 1}0${n % 3 + 1}`,
      floor: `${Math.floor(n / 3) + 1}º andar`,
      price: null,
      status: active ? 'Disponível' : 'Vendido',
      bedrooms: 2,
      area: 50,
      parking: 1
    }))
  };
});
let data = JSON.parse(JSON.stringify(seed));
const config = window.PLENITUDE_SUPABASE_CONFIG || {};
const configured = Boolean(config.url && config.anonKey && !config.url.startsWith('COLE_') && !config.anonKey.startsWith('COLE_'));
const db = configured && window.supabase ? window.supabase.createClient(config.url, config.anonKey) : null;
const phone = '5583900000000';
const wa = (message) => `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
const buildingSelect = document.getElementById('building');
const unitSelect = document.getElementById('unit');
const overlay = document.getElementById('adminOverlay');
const loginCard = document.getElementById('adminLogin');
const adminPanel = document.getElementById('adminPanel');
const loginError = document.getElementById('loginError');
const siteNotice = document.getElementById('siteNotice');
const romanNumber = (roman) => BUILDINGS.indexOf(roman) + 1;
const formatPrice = (price) => price ? new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL', maximumFractionDigits:0}).format(price) : 'Consulte';

function setSiteNotice(message) {
  siteNotice.textContent = message;
  siteNotice.hidden = !message;
}
function renderPublic() {
  const host = document.getElementById('projects');
  host.innerHTML = '';
  BUILDINGS.slice(-3).forEach((roman) => {
    const project = data[roman];
    const availableCount = project.units.filter((unit) => unit.status === 'Disponível').length;
    const negotiationCount = project.units.filter((unit) => unit.status === 'Em negociação').length;
    const summary = availableCount
      ? `${availableCount} ${availableCount === 1 ? 'unidade disponível' : 'unidades disponíveis'}`
      : negotiationCount
        ? `${negotiationCount} ${negotiationCount === 1 ? 'unidade em negociação' : 'unidades em negociação'}`
        : 'Sem unidades disponíveis';
    const card = document.createElement('article');
    card.className = 'project';
    card.innerHTML = `<div class="project-photo"><span class="pill">${summary}</span>Imagem ilustrativa</div><div class="project-body"><h3>${project.name}</h3><div class="project-meta">6 apartamentos · João Pessoa, PB</div><div class="mini-units">${project.units.map((unit) => `<div class="mini"><b>${unit.code}</b>${unit.bedrooms} quartos<br>${formatPrice(unit.price)}<br>${unit.status}</div>`).join('')}</div><div class="project-foot"><span>Consulte preços e plantas</span><a href="${wa(`Olá, quero informações sobre o ${project.name}.`)}">Falar com a equipe →</a></div></div>`;
    host.append(card);
  });
  document.getElementById('archiveList').innerHTML = BUILDINGS.slice(0,10).map((roman) => `<span class="archive-tag">Plenitude ${roman} · concluído</span>`).join('');
  document.querySelectorAll('.whatsapp').forEach((link) => link.href = wa('Olá, quero informações sobre os empreendimentos Plenitude.'));
}
async function refreshFromDatabase() {
  if (!db) throw new Error('indisponível');
  const {data: rows, error} = await db.from('apartments')
    .select('building_number,apartment_code,price,status,bedrooms,area,parking,floor')
    .gte('building_number', 11).order('building_number').order('apartment_code');
  if (error) throw error;
  for (const roman of BUILDINGS.slice(-3)) {
    const number = romanNumber(roman);
    data[roman].units = rows.filter((row) => row.building_number === number).map((row) => ({
      code: row.apartment_code, floor: row.floor, price: row.price, status: row.status,
      bedrooms: row.bedrooms, area: row.area, parking: row.parking
    }));
  }
  renderPublic();
  renderAdmin();
  fillUnits();
}
function fillBuildings() {
  buildingSelect.innerHTML = BUILDINGS.slice(-3).map((roman) => `<option value="${roman}">Plenitude ${roman}</option>`).join('');
  buildingSelect.value = 'XI';
  fillUnits();
}
function fillUnits() {
  const project = data[buildingSelect.value];
  unitSelect.innerHTML = project.units.map((unit) => `<option value="${unit.code}">Apartamento ${unit.code}</option>`).join('');
  loadUnit();
}
function loadUnit() {
  const unit = data[buildingSelect.value].units.find((item) => item.code === unitSelect.value);
  if (!unit) return;
  document.getElementById('price').value = unit.price || '';
  document.getElementById('statusSelect').value = unit.status;
  document.getElementById('bedrooms').value = unit.bedrooms;
  document.getElementById('area').value = unit.area;
  document.getElementById('parking').value = unit.parking;
  document.getElementById('floor').value = unit.floor;
  document.getElementById('savedMsg').textContent = '';
}
function renderAdmin() {
  document.getElementById('adminRows').innerHTML = BUILDINGS.slice(-3).flatMap((roman) => data[roman].units.map((unit) => `<tr><td>Plenitude ${roman}</td><td>${unit.code}</td><td>${formatPrice(unit.price)}</td><td class="status ${unit.status === 'Vendido' ? 'sold' : unit.status === 'Em negociação' ? 'negotiation' : 'available'}">${unit.status}</td><td class="hide-mobile">${unit.bedrooms} quartos · ${unit.area} m² · ${unit.parking} vaga(s)</td></tr>`)).join('');
}
function showLogin(message = '') {
  loginCard.style.display = 'block';
  adminPanel.classList.remove('active');
  loginError.textContent = message;
}
async function hasAdminAccess() {
  const {data: adminRecord, error} = await db.from('site_admins').select('user_id').maybeSingle();
  return !error && Boolean(adminRecord);
}
async function enterAdmin() {
  loginCard.style.display = 'none';
  adminPanel.classList.add('active');
  try { await refreshFromDatabase(); }
  catch { showLogin('Não foi possível carregar as unidades agora. Tente novamente mais tarde.'); }
}
async function openAdmin(event) {
  if (event) event.preventDefault();
  overlay.classList.add('open');
  showLogin('');
  if (!db) { showLogin('O painel ainda não está disponível. Peça ajuda ao responsável pelo site.'); return; }
  try {
    const {data: sessionData} = await db.auth.getSession();
    if (sessionData.session) {
      if (await hasAdminAccess()) await enterAdmin();
      else { await db.auth.signOut(); showLogin('Este usuário ainda não tem acesso ao painel.'); }
    }
  } catch { showLogin('Não foi possível abrir o painel agora. Tente novamente mais tarde.'); }
}
function closeAdmin() {
  overlay.classList.remove('open');
  adminPanel.classList.remove('active');
  loginCard.style.display = 'block';
}
document.getElementById('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!db) { showLogin('O painel ainda não está disponível. Peça ajuda ao responsável pelo site.'); return; }
  const email = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const {error} = await db.auth.signInWithPassword({email, password});
  if (error) { showLogin('Não foi possível entrar. Confira seu e-mail e senha.'); return; }
  if (!await hasAdminAccess()) {
    await db.auth.signOut();
    showLogin('Este usuário ainda não tem acesso ao painel.');
    return;
  }
  await enterAdmin();
});
document.getElementById('closeLogin').addEventListener('click', closeAdmin);
document.getElementById('openAdmin').addEventListener('click', openAdmin);
document.getElementById('closeAdmin').addEventListener('click', closeAdmin);
document.getElementById('signOut').addEventListener('click', async () => { if (db) await db.auth.signOut(); closeAdmin(); });
overlay.addEventListener('click', (event) => { if (event.target === overlay) closeAdmin(); });
buildingSelect.addEventListener('change', fillUnits);
unitSelect.addEventListener('change', loadUnit);
document.getElementById('saveUnit').addEventListener('click', async () => {
  const saveMessage = document.getElementById('savedMsg');
  if (!db) { saveMessage.textContent = 'O painel ainda não está disponível.'; return; }
  const projectNumber = romanNumber(buildingSelect.value);
  const unitCode = unitSelect.value;
  const values = {
    price: Number(document.getElementById('price').value) || null,
    status: document.getElementById('statusSelect').value,
    bedrooms: Number(document.getElementById('bedrooms').value) || 0,
    area: Number(document.getElementById('area').value) || 0,
    parking: Number(document.getElementById('parking').value) || 0,
    floor: document.getElementById('floor').value.trim()
  };
  const saveButton = document.getElementById('saveUnit');
  saveButton.disabled = true;
  saveMessage.textContent = 'Salvando…';
  try {
    const {error} = await db.from('apartments').update(values).eq('building_number', projectNumber).eq('apartment_code', unitCode);
    if (error) throw error;
    await refreshFromDatabase();
    loadUnit();
    saveMessage.textContent = 'Alterações salvas.';
  } catch {
    saveMessage.textContent = 'Não foi possível salvar agora. Tente novamente.';
  } finally {
    saveButton.disabled = false;
  }
});
fillBuildings();
renderAdmin();
if (db) {
  setSiteNotice('Carregando disponibilidade…');
  document.getElementById('projects').innerHTML = '';
  refreshFromDatabase().then(() => setSiteNotice('')).catch(() => {
    BUILDINGS.slice(-3).forEach((roman) => { data[roman].units = []; });
    renderPublic();
    renderAdmin();
    setSiteNotice('Não foi possível atualizar a disponibilidade. Consulte a equipe antes de decidir.');
  });
} else {
  renderPublic();
  setSiteNotice('Prévia de demonstração: confirme os dados e a disponibilidade antes de publicar.');
}


