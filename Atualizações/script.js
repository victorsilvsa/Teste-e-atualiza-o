
// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyA_jPOZqD37Efy_vlE-t-rpo5sf8Zuv-A0",
    authDomain: "checklist-3c94f.firebaseapp.com",
    databaseURL: "https://checklist-3c94f-default-rtdb.firebaseio.com",
    projectId: "checklist-3c94f",
    storageBucket: "checklist-3c94f.firebasestorage.app",
    messagingSenderId: "263286954300",
    appId: "1:263286954300:web:e1f3c22499a65f8c0c2639",
    measurementId: "G-LB7T6YWEG1"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let currentUser = null;
let currentInspectionData = null;
let currentLogoUrl = null;
let currentFilter = 'all';
let currentOrder = null;

// Initialize Admin
async function initializeAdmin() {
    const adminRef = database.ref('users/admin');
    const snapshot = await adminRef.once('value');

    if (!snapshot.exists()) {
        await adminRef.set({
            username: 'admin',
            password: 'admin123',
            nome: 'Administrador',
            cnpj: '00.000.000/0000-00',
            tipo: 'admin'
        });
    }
}

// Toast
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Modal
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.body.style.overflow = '';
}

// Logo Management
async function loadLogo() {
    const logoRef = database.ref('settings/logo');
    const snapshot = await logoRef.once('value');
    const logoData = snapshot.val();

    if (logoData && logoData.url) {
        currentLogoUrl = logoData.url;
        updateLogoDisplay(logoData.url);
    }
}

function updateLogoDisplay(url) {
    document.getElementById('loginLogoImg').src = url;
    document.getElementById('loginLogoImg').style.display = 'block';
    document.getElementById('loginLogoText').style.display = 'none';

    document.getElementById('sidebarLogoImg').src = url;
    document.getElementById('sidebarLogoImg').style.display = 'block';
    document.getElementById('sidebarLogoText').style.display = 'none';

    document.getElementById('logoPreviewImg').src = url;
    document.getElementById('logoPreviewImg').style.display = 'block';
    document.getElementById('logoPreviewText').style.display = 'none';

    document.getElementById('removeLogo').style.display = 'block';
}

function clearLogoDisplay() {
    document.getElementById('loginLogoImg').style.display = 'none';
    document.getElementById('loginLogoText').style.display = 'flex';

    document.getElementById('sidebarLogoImg').style.display = 'none';
    document.getElementById('sidebarLogoText').style.display = 'flex';

    document.getElementById('logoPreviewImg').style.display = 'none';
    document.getElementById('logoPreviewText').style.display = 'flex';

    document.getElementById('removeLogo').style.display = 'none';
}

document.getElementById('logoFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        showToast('Arquivo muito grande (máx. 2MB)', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
        const logoUrl = event.target.result;
        currentLogoUrl = logoUrl;

        await database.ref('settings/logo').set({
            url: logoUrl,
            uploadDate: new Date().toISOString(),
            uploadedBy: currentUser.nome
        });

        updateLogoDisplay(logoUrl);
        showToast('Logo atualizada com sucesso!');
    };
    reader.readAsDataURL(file);
});

document.getElementById('removeLogo').addEventListener('click', async () => {
    if (confirm('Tem certeza que deseja remover a logo?')) {
        await database.ref('settings/logo').remove();
        currentLogoUrl = null;
        clearLogoDisplay();
        showToast('Logo removida com sucesso!');
    }
});

// Auto Login
async function autoLogin() {
    const savedUserId = localStorage.getItem('currentUserId');
    if (savedUserId) {
        const snapshot = await database.ref(`users/${savedUserId}`).once('value');
        if (snapshot.exists()) {
            const userData = { id: savedUserId, ...snapshot.val() };
            loginUser(userData);
        } else {
            localStorage.removeItem('currentUserId');
        }
    }
}

// Login
function loginUser(userData) {
    currentUser = userData;
    localStorage.setItem('currentUserId', userData.id);

    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';

    // Update user info
    const initial = userData.nome.charAt(0).toUpperCase();
    document.getElementById('userAvatarMobile').textContent = initial;
    document.getElementById('userNameMobile').textContent = userData.nome;
    document.getElementById('userRoleMobile').textContent = userData.tipo === 'admin' ? 'Administrador' : 'Técnico';

    document.getElementById('userAvatarDesktop').textContent = initial;
    document.getElementById('userNameDesktop').textContent = userData.nome;
    document.getElementById('userRoleDesktop').textContent = userData.tipo === 'admin' ? 'Administrador' : 'Técnico';

    // Show desktop sidebar on desktop
    if (window.innerWidth >= 1024) {
        document.getElementById('sidebarDesktop').style.display = 'flex';
    }

    loadDashboard();
    loadLogo();
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    const usersRef = database.ref('users');
    const snapshot = await usersRef.once('value');
    const users = snapshot.val();

    let authenticated = false;
    let userData = null;

    for (let key in users) {
        if (users[key].username === username && users[key].password === password) {
            authenticated = true;
            userData = { id: key, ...users[key] };
            break;
        }
    }

    if (authenticated) {
        loginUser(userData);
        showToast('Login realizado com sucesso!');
    } else {
        showToast('Usuário ou senha incorretos', 'error');
    }
});

// Logout
document.getElementById('logoutBtnMobile').addEventListener('click', logout);
document.getElementById('logoutBtnDesktop').addEventListener('click', logout);

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUserId');

    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('loginForm').reset();
    showToast('Logout realizado com sucesso!');
}

// Navigation - Mobile
document.querySelectorAll('.nav-item-mobile').forEach(item => {
    item.addEventListener('click', () => {
        const section = item.dataset.section;
        navigateToSection(section);

        document.querySelectorAll('.nav-item-mobile').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
    });
});

// Navigation - Desktop
document.querySelectorAll('.nav-item-desktop').forEach(item => {
    item.addEventListener('click', () => {
        const section = item.dataset.section;
        navigateToSection(section);

        document.querySelectorAll('.nav-item-desktop').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
    });
});

function navigateToSection(section) {
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));

    const el = document.getElementById(section + 'Section');
    if (el) el.classList.add('active');

    if (section === 'overview') loadDashboard();
    else if (section === 'companies') loadCompanies();
    else if (section === 'inspections') loadInspections();
    else if (section === 'orders') loadOrders(); // ✅ NOVA ABA
    else if (section === 'config') loadConfig();
}


// Load Dashboard
async function loadDashboard() {
    const companiesSnapshot = await database.ref('companies').once('value');
    const inspectionsSnapshot = await database.ref('inspections').once('value');

    const companies = companiesSnapshot.val() || {};
    const inspections = inspectionsSnapshot.val() || {};

    const totalCompanies = Object.keys(companies).length;
    const totalInspections = Object.keys(inspections).length;
    const pendingInspections = Object.values(inspections).filter(i => !i.completed).length;

    document.getElementById('totalCompanies').textContent = totalCompanies;
    document.getElementById('totalInspections').textContent = totalInspections;
    document.getElementById('pendingInspections').textContent = pendingInspections;
}

// Load Companies
async function loadCompanies() {
    const snapshot = await database.ref('companies').once('value');
    const companies = snapshot.val() || {};

    const list = document.getElementById('companiesList');
    list.innerHTML = '';

    if (Object.keys(companies).length === 0) {
        list.innerHTML = `
            <div class="empty-state">
              <i class="fas fa-building"></i>
              <p>Nenhuma empresa cadastrada</p>
            </div>
          `;
        return;
    }

    for (let key in companies) {
        const company = companies[key];
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="list-item-header">
              <div>
                <div class="list-item-title">${company.razao_social}</div>
                <div class="list-item-subtitle">${company.cnpj}</div>
              </div>
            </div>
            <div class="list-item-info">
              <div class="list-item-info-row">
                <span class="list-item-info-label">Telefone:</span>
                <span class="list-item-info-value">${company.telefone || '-'}</span>
              </div>
              <div class="list-item-info-row">
                <span class="list-item-info-label">Responsável:</span>
                <span class="list-item-info-value">${company.responsavel || '-'}</span>
              </div>
                      <div class="list-item-info-row">
                <span class="list-item-info-label">Endereço:</span>
                <span class="list-item-info-value">${company.endereco || '-'}</span>
              </div>
            </div>
            <div class="list-item-actions">
              <button class="btn-small btn-primary" onclick="startInspection('${key}')">
                <i class="fas fa-clipboard-check"></i> Nova Inspeção
              </button>
            </div>
          `;
        list.appendChild(item);
    }
}

// Add Company
document.getElementById('addCompanyBtn').addEventListener('click', () => {
    openModal('addCompanyModal');
});

// Manual Inspection
document.getElementById('manualInspectionBtn').addEventListener('click', () => {
    openModal('inspectionFormModal');
    // Clear form for manual entry
    document.getElementById('inspectionForm').reset();
});

document.getElementById('addCompanyForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const companyData = Object.fromEntries(formData);

    await database.ref('companies').push(companyData);

    showToast('Empresa cadastrada com sucesso!');
    closeModal('addCompanyModal');
    e.target.reset();
    loadCompanies();
    loadDashboard();
});

// Start Inspection
async function startInspection(companyId) {
    const snapshot = await database.ref(`companies/${companyId}`).once('value');
    const company = snapshot.val();

    openModal('inspectionFormModal');

    setTimeout(() => {
        document.querySelector('input[name="razao_social"]').value = company.razao_social;
        document.querySelector('input[name="cnpj"]').value = company.cnpj;
        document.querySelector('input[name="telefone"]').value = company.telefone || '';
        document.querySelector('input[name="endereco"]').value = company.endereco || '';
        document.querySelector('input[name="responsavel"]').value = company.responsavel || '';
    }, 100);
}

// Inspection Tabs
document.querySelectorAll('.inspection-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const section = tab.dataset.section;

        document.querySelectorAll('.inspection-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        document.querySelectorAll('.inspection-section').forEach(sec => sec.classList.remove('active'));
        document.getElementById('section-' + section).classList.add('active');
    });
});

// Conditional Sections
document.getElementById('hasBombas').addEventListener('change', (e) => {
    document.getElementById('bombasSection').classList.toggle('visible', e.target.checked);
});

document.getElementById('hasBombaJockey').addEventListener('change', (e) => {
    document.getElementById('bombaJockeySection').classList.toggle('visible', e.target.checked);
});

document.getElementById('hasHidrantes').addEventListener('change', (e) => {
    document.getElementById('hidrantesSection').classList.toggle('visible', e.target.checked);
});

document.getElementById('hasAlarme').addEventListener('change', (e) => {
    document.getElementById('alarmeSection').classList.toggle('visible', e.target.checked);
});

document.getElementById('hasExtintores').addEventListener('change', (e) => {
    document.getElementById('extintoresSection').classList.toggle('visible', e.target.checked);
});

document.getElementById('hasSinalizacao').addEventListener('change', (e) => {
    document.getElementById('sinalizacaoSection').classList.toggle('visible', e.target.checked);
});

// PDF GENERATORS - Um para cada tipo de inspeção

// 1. PDF COMPLETO
function generateCompletePDF(data) {
    const isMobile = window.innerWidth <= 768;
    let html = '';

    if (isMobile) {
        // ============================================
        // MODO MOBILE - UMA INSPEÇÃO POR PÁGINA
        // ============================================

        // -------------------------------------
        // Página 1 - Cliente e Certificado
        // -------------------------------------
        html += `<div class="pdf-page">`;
        html += generatePDFHeader('RELATÓRIO COMPLETO DE INSPEÇÃO');
        html += generateClientSection(data);

        if (data.cert_tipo) {
            html += generateCertificateSection(data);
        }

        html += generatePDFFooter();
        html += `</div>`;


        // -------------------------------------
        // Página 2 - Bombas (se existir)
        // -------------------------------------
        if (data.has_bombas) {
            html += `<div class="pdf-page">`;
            html += generatePDFHeader('RELATÓRIO COMPLETO DE INSPEÇÃO');
            html += generateBombasSection(data);
            html += generatePDFFooter();
            html += `</div>`;
        }


        // -------------------------------------
        // Página 3 - Hidrantes (se existir)
        // -------------------------------------
        if (data.has_hidrantes) {
            html += `<div class="pdf-page">`;
            html += generatePDFHeader('RELATÓRIO COMPLETO DE INSPEÇÃO');
            html += generateHidrantesSection(data);
            html += generatePDFFooter();
            html += `</div>`;
        }


        // -------------------------------------
        // Página 4 - Alarme (se existir)
        // -------------------------------------
        if (data.has_alarme) {
            html += `<div class="pdf-page">`;
            html += generatePDFHeader('RELATÓRIO COMPLETO DE INSPEÇÃO');
            html += generateAlarmeSection(data);
            html += generatePDFFooter();
            html += `</div>`;
        }


        // -------------------------------------
        // Página 5 - Extintores (se existir)
        // -------------------------------------
        if (data.has_extintores) {
            html += `<div class="pdf-page">`;
            html += generatePDFHeader('RELATÓRIO COMPLETO DE INSPEÇÃO');
            html += generateExtintoresSection(data);
            html += generatePDFFooter();
            html += `</div>`;
        }


        // -------------------------------------
        // Página 6 - Sinalização (já vem dividida automaticamente pela função)
        // -------------------------------------
        if (data.has_sinalizacao) {
            html += `<div class="pdf-page">`;
            html += generatePDFHeader('RELATÓRIO COMPLETO DE INSPEÇÃO');
            html += generateSinalizacaoSection(data);
            html += generatePDFFooter();
            html += `</div>`;
        }


        // -------------------------------------
        // Página 7 - Conformidade + Assinatura
        // -------------------------------------
        html += `<div class="pdf-page">`;
        html += generatePDFHeader('RELATÓRIO COMPLETO DE INSPEÇÃO');
        html += generateConformidadeSection(data);
        html += generateSignaturesSection(data);
        html += generatePDFFooter();
        html += `</div>`;

    } else {
        // ============================================
        // MODO DESKTOP - INSPEÇÕES AGRUPADAS
        // ============================================

        // -------------------------------------
        // Página 1 - Cliente e Certificado
        // -------------------------------------
        html += `<div class="pdf-page">`;
        html += generatePDFHeader('RELATÓRIO COMPLETO DE INSPEÇÃO');
        html += generateClientSection(data);

        if (data.cert_tipo) {
            html += generateCertificateSection(data);
        }

        html += generatePDFFooter();
        html += `</div>`;


        // -------------------------------------
        // Página 2 - Bombas e Hidrantes
        // -------------------------------------
        if (data.has_bombas || data.has_hidrantes) {
            html += `<div class="pdf-page">`;
            html += generatePDFHeader('RELATÓRIO COMPLETO DE INSPEÇÃO');

            if (data.has_bombas) {
                html += generateBombasSection(data);
            }

            if (data.has_hidrantes) {
                html += generateHidrantesSection(data);
            }

            html += generatePDFFooter();
            html += `</div>`;
        }


        // -------------------------------------
        // Página 3 - Alarme e Extintores
        // -------------------------------------
        if (data.has_alarme || data.has_extintores) {
            html += `<div class="pdf-page">`;
            html += generatePDFHeader('RELATÓRIO COMPLETO DE INSPEÇÃO');

            if (data.has_alarme) {
                html += generateAlarmeSection(data);
            }

            if (data.has_extintores) {
                html += generateExtintoresSection(data);
            }

            html += generatePDFFooter();
            html += `</div>`;
        }


        // -------------------------------------
        // Página 4 - Sinalização
        // -------------------------------------
        html += `<div class="pdf-page">`;
        html += generatePDFHeader('RELATÓRIO COMPLETO DE INSPEÇÃO');

        if (data.has_sinalizacao) {
            html += generateSinalizacaoSection(data);
        }

        html += generatePDFFooter();
        html += `</div>`;


        // -------------------------------------
        // Página 5 - Conformidade + Assinatura
        // -------------------------------------
        html += `<div class="pdf-page">`;
        html += generatePDFHeader('RELATÓRIO COMPLETO DE INSPEÇÃO');

        html += generateConformidadeSection(data);
        html += generateSignaturesSection(data);

        html += generatePDFFooter();
        html += `</div>`;
    }

    return html;
}



// 2. PDF BOMBAS
function generateBombasPDF(data) {
    let html = `<div class="pdf-page">`;
    html += generatePDFHeader('RELATÓRIO DE INSPEÇÃO - SISTEMA DE BOMBAS');
    html += generateClientSection(data);
    html += generateBombasSection(data);
    html += generateSignaturesSection(data);
    html += generatePDFFooter();
    html += `</div>`;
    return html;
}

// 3. PDF HIDRANTES
function generateHidrantesPDF(data) {
    let html = `<div class="pdf-page">`;
    html += generatePDFHeader('RELATÓRIO DE INSPEÇÃO - REDE DE HIDRANTES');
    html += generateClientSection(data);
    html += generateHidrantesSection(data);
    html += generateSignaturesSection(data);
    html += generatePDFFooter();
    html += `</div>`;
    return html;
}

// 4. PDF ALARME
function generateAlarmePDF(data) {
    let html = `<div class="pdf-page">`;
    html += generatePDFHeader('RELATÓRIO DE INSPEÇÃO - SISTEMA DE ALARME');
    html += generateClientSection(data);
    html += generateAlarmeSection(data);
    html += generateSignaturesSection(data);
    html += generatePDFFooter();
    html += `</div>`;
    return html;
}

// 5. PDF EXTINTORES
function generateExtintoresPDF(data) {
    let html = `<div class="pdf-page">`;
    html += generatePDFHeader('RELATÓRIO DE INSPEÇÃO - EXTINTORES');
    html += generateClientSection(data);
    html += generateExtintoresSection(data);
    html += generateSignaturesSection(data);
    html += generatePDFFooter();
    html += `</div>`;
    return html;
}

// 6. PDF SINALIZAÇÃO
function generateSinalizacaoPDF(data) {
    let html = `<div class="pdf-page">`;
    html += generatePDFHeader('RELATÓRIO DE INSPEÇÃO - SINALIZAÇÃO');
    html += generateClientSection(data);
    html += generateSinalizacaoSection(data);
    html += generateSignaturesSection(data);
    html += generatePDFFooter();
    html += `</div>`;
    return html;
}

// FUNÇÕES AUXILIARES PARA GERAR SEÇÕES

function generatePDFHeader(title) {
    return `
    <div class="pdf-header">
      <div class="pdf-logo">
        ${currentLogoUrl ? `<img src="${currentLogoUrl}" alt="">` : '<div class="pdf-logo-text">EXTINMAIS</div>'}
      </div>
      <div class="pdf-title-section">
        <div class="pdf-main-title">${title}</div>
        <div class="pdf-subtitle">Sistema de Prevenção e Combate a Incêndio</div>
        <div style="font-size: 10px; color: #666; margin-top: 4px; font-weight: normal;">CNPJ: 52.026.476/001-3</div>
      </div>
    </div>
  `;
}

function generateClientSection(data) {
    return `
        <div class="pdf-section">
          <div class="pdf-section-title">
            <i class="fas fa-building"></i> Dados do Cliente
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Razão Social:</div>
            <div class="pdf-field-value">${data.razao_social || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">CNPJ:</div>
            <div class="pdf-field-value">${data.cnpj || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Telefone:</div>
            <div class="pdf-field-value">${data.telefone || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Endereço:</div>
            <div class="pdf-field-value">${data.endereco || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Responsável:</div>
            <div class="pdf-field-value">${data.responsavel || '-'}</div>
          </div>
        </div>
      `;
}

function generateCertificateSection(data) {
    return `
        <div class="pdf-section">
          <div class="pdf-section-title">
            <i class="fas fa-certificate"></i> Certificado AVCB/CLCB
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Tipo:</div>
            <div class="pdf-field-value">${data.cert_tipo}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Número:</div>
            <div class="pdf-field-value">${data.cert_numero || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Validade:</div>
            <div class="pdf-field-value">${data.cert_validade ? new Date(data.cert_validade).toLocaleDateString('pt-BR') : '-'}</div>
          </div>
        </div>
      `;
}

function generateBombasSection(data) {
    let html = `
        <div class="pdf-section">
          <div class="pdf-section-title">
            <i class="fas fa-water"></i> Sistema de Bombas
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Reservatório (L):</div>
            <div class="pdf-field-value">${data.reservatorio_tamanho || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Bomba Principal - Potência:</div>
            <div class="pdf-field-value">${data.bomba_principal_potencia || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Teste de Partida:</div>
            <div class="pdf-field-value">${data.bomba_principal_teste === 'Sim' ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Estado Geral:</div>
            <div class="pdf-field-value">${data.bomba_principal_estado || '-'}</div>
          </div>
      `;

    if (data.has_bomba_jockey) {
        html += `
          <div class="pdf-field">
            <div class="pdf-field-label">Bomba Jockey - Potência:</div>
            <div class="pdf-field-value">${data.jockey_potencia || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Partida Automática:</div>
            <div class="pdf-field-value">${data.jockey_partida === 'Sim' ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Pressostato Ajustado:</div>
            <div class="pdf-field-value">${data.jockey_pressostato === 'Sim' ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Sem Ruídos:</div>
            <div class="pdf-field-value">${data.jockey_ruidos === 'Sim' ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
        `;
    }

    html += `</div>`;
    return html;
}

function generateHidrantesSection(data) {
    return `
        <div class="pdf-section">
          <div class="pdf-section-title">
            <i class="fas fa-truck-droplet"></i> Rede de Hidrantes
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Diâmetro da Tubulação:</div>
            <div class="pdf-field-value">${data.hidrantes_diametro || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Quantidade de Pontos:</div>
            <div class="pdf-field-value">${data.hidrantes_quantidade || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Suportes Firmes:</div>
            <div class="pdf-field-value">${data.hidrantes_suportes === 'Sim' ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Sem Vazamentos:</div>
            <div class="pdf-field-value">${data.hidrantes_vazamentos === 'Sim' ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Identificação Conforme:</div>
            <div class="pdf-field-value">${data.hidrantes_identificacao === 'Sim' ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Adaptador Storz:</div>
            <div class="pdf-field-value">${data.adaptador_storz || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Material do Adaptador:</div>
            <div class="pdf-field-value">${data.adaptador_material || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Esguicho:</div>
            <div class="pdf-field-value">${data.esguicho_tipo || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Material do Esguicho:</div>
            <div class="pdf-field-value">${data.esguicho_material || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Chave Storz:</div>
            <div class="pdf-field-value">${data.chave_storz || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Material da Chave:</div>
            <div class="pdf-field-value">${data.chave_material || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Tipo de Mangueira:</div>
            <div class="pdf-field-value">${data.mangueira_tipo || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Diâmetro da Mangueira:</div>
            <div class="pdf-field-value">${data.mangueira_diametro || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Comprimento da Mangueira:</div>
            <div class="pdf-field-value">${data.mangueira_comprimento ? data.mangueira_comprimento + ' metros' : '-'}</div>
          </div>
        </div>
      `;
}

function generateAlarmeSection(data) {
    return `
        <div class="pdf-section">
          <div class="pdf-section-title">
            <i class="fas fa-bell"></i> Sistema de Alarme
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Quantidade de Pontos:</div>
            <div class="pdf-field-value">${data.alarme_pontos || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Tipo de Central:</div>
            <div class="pdf-field-value">${data.alarme_central_tipo || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Central Liga:</div>
            <div class="pdf-field-value">${data.central_liga ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Sem Falhas:</div>
            <div class="pdf-field-value">${data.central_sem_falhas ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Baterias Testadas:</div>
            <div class="pdf-field-value">${data.central_baterias_testadas ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Detectores (Qtd):</div>
            <div class="pdf-field-value">${data.detectores_quantidade || '-'}</div>
          </div>
        </div>
      `;
}

function generateExtintoresSection(data) {
    return `
        <div class="pdf-section">
          <div class="pdf-section-title">
            <i class="fas fa-fire-extinguisher"></i> Extintores de Incêndio
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Quantidade:</div>
            <div class="pdf-field-value">${data.extintores_quantidade || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Tipo:</div>
            <div class="pdf-field-value">${data.extintores_tipo || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Peso:</div>
            <div class="pdf-field-value">${data.extintores_peso || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Validade:</div>
            <div class="pdf-field-value">${data.extintores_validade ? new Date(data.extintores_validade).toLocaleDateString('pt-BR') : '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Lacres Intactos:</div>
            <div class="pdf-field-value">${data.extintores_lacres === 'Sim' ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Manômetro OK:</div>
            <div class="pdf-field-value">${data.extintores_manometro === 'Sim' ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
        </div>
      `;
}

function generateSinalizacaoSection(data) {
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        // MOBILE: Divide em duas partes
        let html = '';
        
        // PARTE 1 - Rota de Fuga
        html += `
            <div class="pdf-section">
              <div class="pdf-section-title">
                <i class="fas fa-sign"></i> Sinalização - Parte 1
              </div>
              <div class="pdf-field">
                <div class="pdf-field-label">Placas Fotoluminescentes:</div>
                <div class="pdf-field-value">${data.placas_fotoluminescentes === 'Sim' ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
              </div>
        `;

        // Rota de Fuga
        if (data.sinal_saida && parseInt(data.sinal_saida) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Saída:</div><div class="pdf-field-value">${data.sinal_saida}</div></div>`;
        }
        if (data.sinal_cam_direita && parseInt(data.sinal_cam_direita) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Caminhamento → Direita:</div><div class="pdf-field-value">${data.sinal_cam_direita}</div></div>`;
        }
        if (data.sinal_cam_esquerda && parseInt(data.sinal_cam_esquerda) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Caminhamento → Esquerda:</div><div class="pdf-field-value">${data.sinal_cam_esquerda}</div></div>`;
        }
        if (data.sinal_esc_up_direita && parseInt(data.sinal_esc_up_direita) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Escada ↑ Direita:</div><div class="pdf-field-value">${data.sinal_esc_up_direita}</div></div>`;
        }
        if (data.sinal_esc_up_esquerda && parseInt(data.sinal_esc_up_esquerda) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Escada ↑ Esquerda:</div><div class="pdf-field-value">${data.sinal_esc_up_esquerda}</div></div>`;
        }
        if (data.sinal_esc_down_direita && parseInt(data.sinal_esc_down_direita) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Escada ↓ Direita:</div><div class="pdf-field-value">${data.sinal_esc_down_direita}</div></div>`;
        }
        if (data.sinal_esc_down_esquerda && parseInt(data.sinal_esc_down_esquerda) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Escada ↓ Esquerda:</div><div class="pdf-field-value">${data.sinal_esc_down_esquerda}</div></div>`;
        }

        html += `</div>`;

        // PARTE 2 - Hidrantes, Acionadores e Placas
        html += `
            <div class="pdf-section">
              <div class="pdf-section-title">
                <i class="fas fa-sign"></i> Sinalização - Parte 2
              </div>
        `;

        // Sinalização de Hidrantes
        if (data.sinal_hidrante && parseInt(data.sinal_hidrante) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Hidrante:</div><div class="pdf-field-value">${data.sinal_hidrante}</div></div>`;
        }

        // Sinalização de Acionadores
        if (data.sinal_acion_bomba && parseInt(data.sinal_acion_bomba) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Acionamento de Bomba:</div><div class="pdf-field-value">${data.sinal_acion_bomba}</div></div>`;
        }
        if (data.sinal_acion_alarme && parseInt(data.sinal_acion_alarme) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Acionamento de Alarme:</div><div class="pdf-field-value">${data.sinal_acion_alarme}</div></div>`;
        }
        if (data.sinal_central_alarme && parseInt(data.sinal_central_alarme) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Central de Alarme:</div><div class="pdf-field-value">${data.sinal_central_alarme}</div></div>`;
        }
        if (data.sinal_bomba_incendio && parseInt(data.sinal_bomba_incendio) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Bomba de Incêndio:</div><div class="pdf-field-value">${data.sinal_bomba_incendio}</div></div>`;
        }

        // Placas Específicas
        if (data.placa_lotacao && parseInt(data.placa_lotacao) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Placa de Lotação (Nº Pessoas):</div><div class="pdf-field-value">${data.placa_lotacao}</div></div>`;
        }
        if (data.placa_m1 && parseInt(data.placa_m1) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Placa M1:</div><div class="pdf-field-value">${data.placa_m1}</div></div>`;
        }
        if (data.placa_extintor && parseInt(data.placa_extintor) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Extintor:</div><div class="pdf-field-value">${data.placa_extintor}</div></div>`;
        }
        if (data.placa_ilum_emerg && parseInt(data.placa_ilum_emerg) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Iluminação de Emergência:</div><div class="pdf-field-value">${data.placa_ilum_emerg}</div></div>`;
        }
        if (data.placa_sinal_emerg && parseInt(data.placa_sinal_emerg) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Sinalização de Emergência:</div><div class="pdf-field-value">${data.placa_sinal_emerg}</div></div>`;
        }
        if (data.placa_alarme && parseInt(data.placa_alarme) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Alarme de Incêndio:</div><div class="pdf-field-value">${data.placa_alarme}</div></div>`;
        }
        if (data.placa_hidrante_espec && parseInt(data.placa_hidrante_espec) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Hidrante:</div><div class="pdf-field-value">${data.placa_hidrante_espec}</div></div>`;
        }

        html += `</div>`;
        return html;
        
    } else {
        // DESKTOP: Mantém tudo junto
        let html = `
            <div class="pdf-section">
              <div class="pdf-section-title">
                <i class="fas fa-sign"></i> Sinalização
              </div>
              <div class="pdf-field">
                <div class="pdf-field-label">Placas Fotoluminescentes:</div>
                <div class="pdf-field-value">${data.placas_fotoluminescentes === 'Sim' ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
              </div>
        `;

        // Rota de Fuga
        if (data.sinal_saida && parseInt(data.sinal_saida) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Saída:</div><div class="pdf-field-value">${data.sinal_saida}</div></div>`;
        }
        if (data.sinal_cam_direita && parseInt(data.sinal_cam_direita) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Caminhamento → Direita:</div><div class="pdf-field-value">${data.sinal_cam_direita}</div></div>`;
        }
        if (data.sinal_cam_esquerda && parseInt(data.sinal_cam_esquerda) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Caminhamento → Esquerda:</div><div class="pdf-field-value">${data.sinal_cam_esquerda}</div></div>`;
        }
        if (data.sinal_esc_up_direita && parseInt(data.sinal_esc_up_direita) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Escada ↑ Direita:</div><div class="pdf-field-value">${data.sinal_esc_up_direita}</div></div>`;
        }
        if (data.sinal_esc_up_esquerda && parseInt(data.sinal_esc_up_esquerda) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Escada ↑ Esquerda:</div><div class="pdf-field-value">${data.sinal_esc_up_esquerda}</div></div>`;
        }
        if (data.sinal_esc_down_direita && parseInt(data.sinal_esc_down_direita) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Escada ↓ Direita:</div><div class="pdf-field-value">${data.sinal_esc_down_direita}</div></div>`;
        }
        if (data.sinal_esc_down_esquerda && parseInt(data.sinal_esc_down_esquerda) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Escada ↓ Esquerda:</div><div class="pdf-field-value">${data.sinal_esc_down_esquerda}</div></div>`;
        }

        // Sinalização de Hidrantes
        if (data.sinal_hidrante && parseInt(data.sinal_hidrante) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Hidrante:</div><div class="pdf-field-value">${data.sinal_hidrante}</div></div>`;
        }

        // Sinalização de Acionadores
        if (data.sinal_acion_bomba && parseInt(data.sinal_acion_bomba) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Acionamento de Bomba:</div><div class="pdf-field-value">${data.sinal_acion_bomba}</div></div>`;
        }
        if (data.sinal_acion_alarme && parseInt(data.sinal_acion_alarme) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Acionamento de Alarme:</div><div class="pdf-field-value">${data.sinal_acion_alarme}</div></div>`;
        }
        if (data.sinal_central_alarme && parseInt(data.sinal_central_alarme) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Central de Alarme:</div><div class="pdf-field-value">${data.sinal_central_alarme}</div></div>`;
        }
        if (data.sinal_bomba_incendio && parseInt(data.sinal_bomba_incendio) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Bomba de Incêndio:</div><div class="pdf-field-value">${data.sinal_bomba_incendio}</div></div>`;
        }

        // Placas Específicas
        if (data.placa_lotacao && parseInt(data.placa_lotacao) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Placa de Lotação (Nº Pessoas):</div><div class="pdf-field-value">${data.placa_lotacao}</div></div>`;
        }
        if (data.placa_m1 && parseInt(data.placa_m1) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Placa M1:</div><div class="pdf-field-value">${data.placa_m1}</div></div>`;
        }
        if (data.placa_extintor && parseInt(data.placa_extintor) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Extintor:</div><div class="pdf-field-value">${data.placa_extintor}</div></div>`;
        }
        if (data.placa_ilum_emerg && parseInt(data.placa_ilum_emerg) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Iluminação de Emergência:</div><div class="pdf-field-value">${data.placa_ilum_emerg}</div></div>`;
        }
        if (data.placa_sinal_emerg && parseInt(data.placa_sinal_emerg) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Sinalização de Emergência:</div><div class="pdf-field-value">${data.placa_sinal_emerg}</div></div>`;
        }
        if (data.placa_alarme && parseInt(data.placa_alarme) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Alarme de Incêndio:</div><div class="pdf-field-value">${data.placa_alarme}</div></div>`;
        }
        if (data.placa_hidrante_espec && parseInt(data.placa_hidrante_espec) > 0) {
            html += `<div class="pdf-field"><div class="pdf-field-label">Hidrante:</div><div class="pdf-field-value">${data.placa_hidrante_espec}</div></div>`;
        }

        html += `</div>`;
        return html;
    }
}



function generateConformidadeSection(data) {
    return `
        <div class="pdf-section">
          <div class="pdf-section-title">
            <i class="fas fa-check-circle"></i> Conformidade Geral
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Rotas Desobstruídas:</div>
            <div class="pdf-field-value">${data.conf_rotas_desobstruidas ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Equipamentos Acessíveis:</div>
            <div class="pdf-field-value">${data.conf_equipamentos_acessiveis ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Limpeza e Organização:</div>
            <div class="pdf-field-value">${data.conf_limpeza ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Conforme Projeto:</div>
            <div class="pdf-field-value">${data.conf_projeto_aprovado ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Nº do Projeto:</div>
            <div class="pdf-field-value">${data.numero_projeto || '-'}</div>
          </div>
        </div>
      `;
}

function generateSignaturesSection(data) {
    return `
        <div class="pdf-section" style="margin-top: 40px; page-break-inside: avoid;">
          <div class="pdf-section-title">
            <i class="fas fa-signature"></i> Assinaturas
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px;">
            <div style="text-align: center;">
              <div style="border-top: 2px solid #333; padding-top: 10px; margin-top: 60px;">
                <strong style="color: #333;">Assinatura do Técnico</strong>
                <p style="color: #666; font-size: 12px; margin-top: 5px;">${currentUser ? currentUser.nome : 'Técnico Responsável'}</p>
                <p style="color: #666; font-size: 11px;">CNPJ: ${currentUser ? currentUser.cnpj : '__.___.___/____-__'}</p>
              </div>
            </div>
            <div style="text-align: center;">
              <div style="border-top: 2px solid #333; padding-top: 10px; margin-top: 60px;">
                <strong style="color: #333;">Assinatura do Cliente</strong>
                <p style="color: #666; font-size: 12px; margin-top: 5px;">${data.responsavel || 'Responsável pela Empresa'}</p>
<p style="color: #666; font-size: 11px;">Endereço: ${data.endereco || 'Endereço não informado'}</p>
              </div>
            </div>
          </div>
        </div>
      `;
}

function generatePDFFooter() {
    return `
        <div class="pdf-footer">
          <p>Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
          <p>EXTINMAIS - Sistema de Inspeção de Incêndio</p>
        </div>
      `;
}

// Generate Report Button - Show Selection Modal
document.getElementById('generateReportBtn').addEventListener('click', () => {
    const form = document.getElementById('inspectionForm');
    const formData = new FormData(form);
    const data = {};

    for (let [key, value] of formData.entries()) {
        if (form.elements[key].type === 'checkbox') {
            data[key] = form.elements[key].checked;
        } else {
            data[key] = value;
        }
    }

    currentInspectionData = data;

    // Build PDF selection options
    const grid = document.getElementById('pdfSelectionGrid');
    grid.innerHTML = '';

    const options = [
        { id: 'complete', icon: 'fa-file-alt', title: 'Relatório Completo', desc: 'Todos os sistemas inspecionados' },
    ];

    if (data.has_bombas) {
        options.push({ id: 'bombas', icon: 'fa-water', title: 'Sistema de Bombas', desc: 'Apenas bombas e reservatório' });
    }
    if (data.has_hidrantes) {
        options.push({ id: 'hidrantes', icon: 'fa-truck-droplet', title: 'Rede de Hidrantes', desc: 'Apenas hidrantes e acessórios' });
    }
    if (data.has_alarme) {
        options.push({ id: 'alarme', icon: 'fa-bell', title: 'Sistema de Alarme', desc: 'Apenas alarme e detectores' });
    }
    if (data.has_extintores) {
        options.push({ id: 'extintores', icon: 'fa-fire-extinguisher', title: 'Extintores', desc: 'Apenas extintores' });
    }
    if (data.has_sinalizacao) {
        options.push({ id: 'sinalizacao', icon: 'fa-sign', title: 'Sinalização', desc: 'Apenas placas e sinalização' });
    }

    options.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'pdf-option';
        div.innerHTML = `
          <i class="fas ${opt.icon}"></i>
          <div class="pdf-option-content">
            <div class="pdf-option-title">${opt.title}</div>
            <div class="pdf-option-desc">${opt.desc}</div>
          </div>
        `;
        div.onclick = () => generateSelectedPDF(opt.id);
        grid.appendChild(div);
    });

    closeModal('inspectionFormModal');
    openModal('pdfSelectionModal');
});

// Generate Selected PDF
function generateSelectedPDF(type) {
    const data = currentInspectionData;
    let html = '';

    switch (type) {
        case 'complete':
            html = generateCompletePDF(data);
            break;
        case 'bombas':
            html = generateBombasPDF(data);
            break;
        case 'hidrantes':
            html = generateHidrantesPDF(data);
            break;
        case 'alarme':
            html = generateAlarmePDF(data);
            break;
        case 'extintores':
            html = generateExtintoresPDF(data);
            break;
        case 'sinalizacao':
            html = generateSinalizacaoPDF(data);
            break;
    }

    document.getElementById('pdfPreview').innerHTML = html;

    closeModal('pdfSelectionModal');

    document.querySelectorAll('.nav-item-mobile').forEach(nav => nav.classList.remove('active'));
    document.querySelectorAll('.nav-item-desktop').forEach(nav => nav.classList.remove('active'));

    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById('pdfPreviewSection').classList.add('active');
}

// Finish Inspection
document.getElementById('finishInspectionBtn').addEventListener('click', async () => {
    const button = document.getElementById('finishInspectionBtn');
    button.disabled = true;
    button.innerHTML = '<span class="loading"></span> Finalizando...';

    try {
        const form = document.getElementById('inspectionForm');
        const formData = new FormData(form);
        const data = {};

        for (let [key, value] of formData.entries()) {
            if (form.elements[key].type === 'checkbox') {
                data[key] = form.elements[key].checked;
            } else {
                data[key] = value;
            }
        }

        const inspectionData = {
            ...data,
            tecnico_id: currentUser.id,
            tecnico_nome: currentUser.nome,
            data: new Date().toISOString(),
            completed: true
        };

        await database.ref('inspections').push(inspectionData);

        showToast('Inspeção finalizada com sucesso!');

        closeModal('inspectionFormModal');
        form.reset();
        document.querySelectorAll('.conditional-section').forEach(sec => sec.classList.remove('visible'));

        setTimeout(() => {
            navigateToSection('inspections');
            document.querySelectorAll('.nav-item-mobile').forEach(nav => {
                if (nav.dataset.section === 'inspections') nav.classList.add('active');
                else nav.classList.remove('active');
            });
            document.querySelectorAll('.nav-item-desktop').forEach(nav => {
                if (nav.dataset.section === 'inspections') nav.classList.add('active');
                else nav.classList.remove('active');
            });
        }, 1000);
    } catch (error) {
        console.error('Error finishing inspection:', error);
        showToast('Erro ao finalizar inspeção', 'error');
    } finally {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-check-circle"></i> Finalizar Inspeção';
    }
});

// Back to Form
document.getElementById('backToFormBtn').addEventListener('click', () => {
    openModal('inspectionFormModal');
    navigateToSection('inspections');
});

// Download PDF
document.getElementById('downloadPdfBtn').addEventListener('click', async () => {
    const button = document.getElementById('downloadPdfBtn');
    button.disabled = true;
    button.innerHTML = '<span class="loading"></span> Gerando...';

    try {
        const { jsPDF } = window.jspdf;
        const pages = document.querySelectorAll('#pdfPreview .pdf-page');
        const pdf = new jsPDF('p', 'mm', 'a4');

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];

            const canvas = await html2canvas(page, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/jpeg', 1.0);

            if (i > 0) {
                pdf.addPage();
            }

            const pageWidth = 210;
            const pageHeight = 297;
            const imgWidth = pageWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
        }

        const fileName = `Inspecao_${currentInspectionData.razao_social}_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);

        showToast('PDF baixado com sucesso!');
    } catch (error) {
        console.error('Error generating PDF:', error);
        showToast('Erro ao gerar PDF', 'error');
    } finally {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-download"></i> Baixar PDF';
    }
});

// Save Inspection
document.getElementById('saveInspectionBtn').addEventListener('click', async () => {
    const button = document.getElementById('saveInspectionBtn');
    button.disabled = true;
    button.innerHTML = '<span class="loading"></span> Salvando...';

    try {
        const inspectionData = {
            ...currentInspectionData,
            tecnico_id: currentUser.id,
            tecnico_nome: currentUser.nome,
            data: new Date().toISOString(),
            completed: false
        };

        await database.ref('inspections').push(inspectionData);

        showToast('Inspeção salva com sucesso!');

        setTimeout(() => {
            navigateToSection('inspections');
            document.querySelectorAll('.nav-item-mobile').forEach(nav => {
                if (nav.dataset.section === 'inspections') nav.classList.add('active');
                else nav.classList.remove('active');
            });
            document.querySelectorAll('.nav-item-desktop').forEach(nav => {
                if (nav.dataset.section === 'inspections') nav.classList.add('active');
                else nav.classList.remove('active');
            });
        }, 1000);
    } catch (error) {
        console.error('Error saving inspection:', error);
        showToast('Erro ao salvar inspeção', 'error');
    } finally {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-save"></i> Salvar';
    }
});

// Load Inspections
async function loadInspections() {
    const snapshot = await database.ref('inspections').once('value');
    const inspections = snapshot.val() || {};

    const list = document.getElementById('inspectionsList');
    list.innerHTML = '';

    const inspectionsArray = Object.entries(inspections).map(([key, value]) => ({
        id: key,
        ...value
    }));

    // Filtro
    const filtered = inspectionsArray.filter(insp => {
        if (currentFilter === 'all') return true;
        if (currentFilter === 'completed') return insp.completed;
        if (currentFilter === 'pending') return !insp.completed;
        return true;
    });

    if (filtered.length === 0) {
        list.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-clipboard-check"></i>
        <p>Nenhuma inspeção encontrada</p>
      </div>
    `;
        return;
    }

    filtered.forEach(insp => {
        const statusBadge = insp.completed
            ? '<span class="badge badge-completed">Concluída</span>'
            : '<span class="badge badge-pending">Pendente</span>';

        const sistemas = [];
        if (insp.has_bombas) sistemas.push('Bombas');
        if (insp.has_hidrantes) sistemas.push('Hidrantes');
        if (insp.has_alarme) sistemas.push('Alarme');
        if (insp.has_extintores) sistemas.push('Extintores');
        if (insp.has_sinalizacao) sistemas.push('Sinalização');

        const item = document.createElement('div');
        item.className = 'list-item';

        item.innerHTML = `
      <div class="list-item-header">
        <div>
          <div class="list-item-title">${insp.razao_social || 'N/A'}</div>
          <div class="list-item-subtitle">${new Date(insp.data).toLocaleDateString('pt-BR')}</div>
        </div>
        ${statusBadge}
      </div>

      <div class="list-item-info">
        <div class="list-item-info-row">
          <span class="list-item-info-label">CNPJ:</span>
          <span class="list-item-info-value">${insp.cnpj || '-'}</span>
        </div>

        <div class="list-item-info-row">
          <span class="list-item-info-label">Endereço:</span>
          <span class="list-item-info-value">${insp.endereco || '-'}</span>
        </div>

        <div class="list-item-info-row">
          <span class="list-item-info-label">Técnico:</span>
          <span class="list-item-info-value">${insp.tecnico_nome || '-'}</span>
        </div>

        <div class="list-item-info-row">
          <span class="list-item-info-label">Sistemas:</span>
          <span class="list-item-info-value">${sistemas.join(', ') || '-'}</span>
        </div>
      </div>

      <div class="list-item-actions">
        ${!insp.completed ? `<button class="btn-small btn-success" onclick="markAsCompleted('${insp.id}')">
          <i class="fas fa-check-circle"></i> Finalizar
        </button>` : ''}
        <button class="btn-small btn-info" onclick="viewInspection('${insp.id}')">
          <i class="fas fa-eye"></i> Ver
        </button>
        <button class="btn-small btn-primary" onclick="showPDFOptionsForInspection('${insp.id}')">
          <i class="fas fa-download"></i> PDF
        </button>
      </div>
    `;

        list.appendChild(item);
    });
}

// Filter Inspections
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        currentFilter = btn.dataset.filter;

        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        loadInspections();
    });
});

// Search Inspections
document.getElementById('inspectionSearch').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const items = document.querySelectorAll('#inspectionsList .list-item');

    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(searchTerm) ? '' : 'none';
    });
});

// Mark as Completed
async function markAsCompleted(inspectionId) {
    if (confirm('Tem certeza que deseja marcar esta inspeção como concluída?')) {
        try {
            await database.ref(`inspections/${inspectionId}`).update({
                completed: true,
                completedDate: new Date().toISOString()
            });
            showToast('Inspeção finalizada com sucesso!');
            loadInspections();
            loadDashboard();
        } catch (error) {
            console.error('Error completing inspection:', error);
            showToast('Erro ao finalizar inspeção', 'error');
        }
    }
}

// View Inspection
async function viewInspection(inspectionId) {
    const snapshot = await database.ref(`inspections/${inspectionId}`).once('value');
    const inspection = snapshot.val();

    currentInspectionData = inspection;

    // Show PDF selection
    const grid = document.getElementById('pdfSelectionGrid');
    grid.innerHTML = '';

    const options = [
        { id: 'complete', icon: 'fa-file-alt', title: 'Relatório Completo', desc: 'Todos os sistemas inspecionados' },
    ];

    if (inspection.has_bombas) {
        options.push({ id: 'bombas', icon: 'fa-water', title: 'Sistema de Bombas', desc: 'Apenas bombas e reservatório' });
    }
    if (inspection.has_hidrantes) {
        options.push({ id: 'hidrantes', icon: 'fa-truck-droplet', title: 'Rede de Hidrantes', desc: 'Apenas hidrantes e acessórios' });
    }
    if (inspection.has_alarme) {
        options.push({ id: 'alarme', icon: 'fa-bell', title: 'Sistema de Alarme', desc: 'Apenas alarme e detectores' });
    }
    if (inspection.has_extintores) {
        options.push({ id: 'extintores', icon: 'fa-fire-extinguisher', title: 'Extintores', desc: 'Apenas extintores' });
    }
    if (inspection.has_sinalizacao) {
        options.push({ id: 'sinalizacao', icon: 'fa-sign', title: 'Sinalização', desc: 'Apenas placas e sinalização' });
    }

    options.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'pdf-option';
        div.innerHTML = `
          <i class="fas ${opt.icon}"></i>
          <div class="pdf-option-content">
            <div class="pdf-option-title">${opt.title}</div>
            <div class="pdf-option-desc">${opt.desc}</div>
          </div>
        `;
        div.onclick = () => generateSelectedPDF(opt.id);
        grid.appendChild(div);
    });

    openModal('pdfSelectionModal');
}

// Show PDF Options for Inspection
async function showPDFOptionsForInspection(inspectionId) {
    const snapshot = await database.ref(`inspections/${inspectionId}`).once('value');
    const inspection = snapshot.val();

    currentInspectionData = inspection;

    // Show PDF selection
    const grid = document.getElementById('pdfSelectionGrid');
    grid.innerHTML = '';

    const options = [
        { id: 'complete', icon: 'fa-file-alt', title: 'Relatório Completo', desc: 'Todos os sistemas inspecionados' },
    ];

    if (inspection.has_bombas) {
        options.push({ id: 'bombas', icon: 'fa-water', title: 'Sistema de Bombas', desc: 'Apenas bombas e reservatório' });
    }
    if (inspection.has_hidrantes) {
        options.push({ id: 'hidrantes', icon: 'fa-truck-droplet', title: 'Rede de Hidrantes', desc: 'Apenas hidrantes e acessórios' });
    }
    if (inspection.has_alarme) {
        options.push({ id: 'alarme', icon: 'fa-bell', title: 'Sistema de Alarme', desc: 'Apenas alarme e detectores' });
    }
    if (inspection.has_extintores) {
        options.push({ id: 'extintores', icon: 'fa-fire-extinguisher', title: 'Extintores', desc: 'Apenas extintores' });
    }
    if (inspection.has_sinalizacao) {
        options.push({ id: 'sinalizacao', icon: 'fa-sign', title: 'Sinalização', desc: 'Apenas placas e sinalização' });
    }

    options.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'pdf-option';
        div.innerHTML = `
          <i class="fas ${opt.icon}"></i>
          <div class="pdf-option-content">
            <div class="pdf-option-title">${opt.title}</div>
            <div class="pdf-option-desc">${opt.desc}</div>
          </div>
        `;
        div.onclick = () => {
            generateSelectedPDF(opt.id);
            // Auto download after generation
            setTimeout(() => {
                document.getElementById('downloadPdfBtn').click();
            }, 500);
        };
        grid.appendChild(div);
    });

    openModal('pdfSelectionModal');
}

// Load Config
function loadConfig() {
    document.getElementById('profileName').value = currentUser.nome;
    document.getElementById('profileCNPJ').value = currentUser.cnpj;
    document.getElementById('profileUsername').value = currentUser.username;
    loadLogo();
}

// Profile Form
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('profileName').value;
    const cnpj = document.getElementById('profileCNPJ').value;
    await database.ref(`users/${currentUser.id}`).update({ nome });
    await database.ref(`users/${currentUser.id}`).update({ cnpj });

    currentUser.nome = nome;

    const initial = nome.charAt(0).toUpperCase();
    document.getElementById('userAvatarMobile').textContent = initial;
    document.getElementById('userNameMobile').textContent = nome;
    document.getElementById('userAvatarDesktop').textContent = initial;
    document.getElementById('userNameDesktop').textContent = nome;

    showToast('Perfil atualizado com sucesso!');
});

// Password Form
document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const currentPassword = formData.get('current_password');
    const newPassword = formData.get('new_password');
    const confirmPassword = formData.get('confirm_password');

    if (currentPassword !== currentUser.password) {
        showToast('Senha atual incorreta', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showToast('As senhas não coincidem', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showToast('A senha deve ter no mínimo 6 caracteres', 'error');
        return;
    }

    await database.ref(`users/${currentUser.id}`).update({ password: newPassword });

    currentUser.password = newPassword;

    showToast('Senha alterada com sucesso!');
    e.target.reset();
});

// Archive Month
document.getElementById('archiveMonthBtn').addEventListener('click', async () => {
    const button = document.getElementById('archiveMonthBtn');
    button.disabled = true;
    button.innerHTML = '<span class="loading"></span> Arquivando...';

    try {
        // Get current month data
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Get all inspections
        const inspectionsSnapshot = await database.ref('inspections').once('value');
        const allInspections = inspectionsSnapshot.val() || {};

        // Filter inspections from current month
        const monthInspections = {};
        for (let key in allInspections) {
            const inspection = allInspections[key];
            const inspectionDate = new Date(inspection.data);

            if (
                inspectionDate.getMonth() === currentMonth &&
                inspectionDate.getFullYear() === currentYear
            ) {
                monthInspections[key] = inspection;
            }
        }

        if (Object.keys(monthInspections).length === 0) {
            showToast('Nenhuma inspeção encontrada neste mês', 'error');
            return;
        }

        // Get companies data
        const companiesSnapshot = await database.ref('companies').once('value');
        const companies = companiesSnapshot.val() || {};

        // Create backup object
        const backup = {
            version: '1.0',
            exportDate: now.toISOString(),
            month: currentMonth + 1,
            year: currentYear,
            user: {
                nome: currentUser.nome,
                cnpj: currentUser.cnpj
            },
            inspections: monthInspections,
            companies: companies,
            logo: currentLogoUrl
        };

        // Download as JSON
        const dataStr = JSON.stringify(backup, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `backup_${currentYear}_${String(currentMonth + 1).padStart(2, '0')}.json`;
        link.click();
        URL.revokeObjectURL(url);

        // ✅ ZERAR DADOS DO FIREBASE APÓS O BACKUP
        await database.ref('inspections').set(null);
        await database.ref('companies').set(null);
        await database.ref('orders').set(null);

        showToast(`Backup criado e dados zerados com sucesso!`);
    } catch (error) {
        console.error('Error creating backup:', error);
        showToast('Erro ao criar backup', 'error');
    } finally {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-download"></i> Arquivar Mês';
    }
});

// Restore Backup
document.getElementById('restoreFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm('Tem certeza que deseja restaurar este backup? Isso irá adicionar os dados ao sistema atual.')) {
        e.target.value = '';
        return;
    }

    try {
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const backup = JSON.parse(event.target.result);

                // Validate backup structure
                if (!backup.version || !backup.inspections) {
                    showToast('Arquivo de backup inválido', 'error');
                    return;
                }

                // Restore companies
                if (backup.companies) {
                    for (let key in backup.companies) {
                        await database.ref(`companies/${key}`).set(backup.companies[key]);
                    }
                }

                // Restore inspections
                let restoredCount = 0;
                for (let key in backup.inspections) {
                    await database.ref(`inspections/${key}`).set(backup.inspections[key]);
                    restoredCount++;
                }

                // Restore logo if exists
                if (backup.logo) {
                    await database.ref('settings/logo').set({
                        url: backup.logo,
                        uploadDate: new Date().toISOString(),
                        uploadedBy: currentUser.nome
                    });
                    currentLogoUrl = backup.logo;
                    updateLogoDisplay(backup.logo);
                }

                showToast(`Backup restaurado! ${restoredCount} inspeções adicionadas.`);
                loadDashboard();
                loadCompanies();
                loadInspections();
            } catch (parseError) {
                console.error('Error parsing backup:', parseError);
                showToast('Erro ao ler arquivo de backup', 'error');
            }
        };
        reader.readAsText(file);
    } catch (error) {
        console.error('Error restoring backup:', error);
        showToast('Erro ao restaurar backup', 'error');
    } finally {
        e.target.value = '';
    }
});

// Initialize
window.addEventListener('load', () => {
    initializeAdmin();
    autoLogin();
});

// Responsive
window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024 && currentUser) {
        document.getElementById('sidebarDesktop').style.display = 'flex';
    } else {
        document.getElementById('sidebarDesktop').style.display = 'none';
    }
});
// ===== ORDENS DE SERVIÇO - Código Unificado e Corrigido =====

let allOrders = []; // cache local

// Carrega ordens do Firebase e atualiza render
async function loadOrders() {
    try {
        const snapshot = await database.ref('orders').once('value');
        const orders = snapshot.val() || {};
        allOrders = Object.entries(orders).map(([id, data]) => ({ id, ...data }));
        renderFilteredOrders();
    } catch (err) {
        console.error('Erro ao carregar orders:', err);
        showToast('Erro ao carregar ordens', 'error');
    }
}

// Renderiza ordens aplicando busca e filtro
function renderFilteredOrders() {
    const list = document.getElementById('ordersList');
    if (!list) return;

    list.innerHTML = '';

    const search = (document.getElementById('orderSearch')?.value || '').toLowerCase();

    // filtro ativo (se existir conjunto de botões dentro #ordersSection)
    const activeFilterBtn = document.querySelector('#ordersSection .filter-btn.active');
    const activeFilter = activeFilterBtn?.dataset?.filter || 'all'; // all, completed, pending

    const filtered = allOrders.filter(os => {
        // normalize fields to avoid undefined
        const cliente = (os.cliente || '').toString().toLowerCase();
        const servico = (os.servico || '').toString().toLowerCase();
        const cnpj = (os.cnpj || '').toString().toLowerCase();

        const matchesText = cliente.includes(search) || servico.includes(search) || cnpj.includes(search);

        const normalizedStatus = (os.status || os.estado || os.completed) // tolerate different fields
            .toString().toLowerCase();

        let matchesStatus = true;
        if (activeFilter === 'completed') matchesStatus = normalizedStatus === 'concluída' || normalizedStatus === 'finalizada' || normalizedStatus === 'true';
        if (activeFilter === 'pending') matchesStatus = !(normalizedStatus === 'concluída' || normalizedStatus === 'finalizada' || normalizedStatus === 'true');

        return matchesText && matchesStatus;
    });

    if (filtered.length === 0) {
        list.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-clipboard-list"></i>
        <p>Nenhuma ordem de serviço encontrada</p>
      </div>
    `;
        return;
    }

    filtered.forEach(os => {
        const statusText = (os.status || os.estado || (os.completed ? 'Concluída' : 'Pendente') || 'Pendente').toString();
        const isFinalizada = /finaliz|conclu/i.test(statusText);

        const statusBadge = isFinalizada
            ? '<span class="badge badge-completed">Finalizada</span>'
            : '<span class="badge badge-pending">Pendente</span>';

        const finalizarBtn = !isFinalizada
            ? `<button class="btn-small btn-success" onclick="finalizarOS('${os.id}')">
           <i class="fas fa-check-circle"></i> Finalizar
         </button>`
            : '';

        const precoFmt = (() => {
            const p = parseFloat(os.preco);
            return isNaN(p)
                ? 'R$ 0,00'
                : p.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                });
        })();


        const dataStr = os.data ? new Date(os.data).toLocaleDateString('pt-BR') : '-';

        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
      <div class="list-item-header">
        <div>
          <div class="list-item-title">${escapeHtml(os.cliente || 'Cliente não informado')}</div>
          <div class="list-item-subtitle">${dataStr}</div>
        </div>
        ${statusBadge}
      </div>

      <div class="list-item-info">
        <div class="list-item-info-row">
          <span class="list-item-info-label">Serviço:</span>
          <span class="list-item-info-value">${escapeHtml(os.servico || '-')}</span>
        </div>
        <div class="list-item-info-row">
          <span class="list-item-info-label">Técnico:</span>
          <span class="list-item-info-value">${escapeHtml(os.tecnico || '-')}</span>
        </div>
        <div class="list-item-info-row">
          <span class="list-item-info-label">Preço:</span>
          <span class="list-item-info-value">${precoFmt}</span>
        </div>
        <div class="list-item-info-row">
          <span class="list-item-info-label">Endereço:</span>
          <span class="list-item-info-value">${escapeHtml(os.endereco || '-')}</span>
        </div>
      </div>

      <div class="list-item-actions">
        <button class="btn-small btn-info" onclick="viewOrder('${os.id}')">
          <i class="fas fa-eye"></i> Ver
        </button>
        ${finalizarBtn}
      </div>
    `;
        list.appendChild(div);
    });
}

// Finalizar OS
async function finalizarOS(orderId) {
    if (!confirm('Deseja finalizar esta Ordem de Serviço?')) return;
    try {
        await database.ref(`orders/${orderId}`).update({
            status: 'finalizada',
            dataFinalizacao: new Date().toISOString()
        });
        showToast('Ordem de Serviço finalizada!');
        await loadOrders();
    } catch (err) {
        console.error('Erro finalizando OS:', err);
        showToast('Erro ao finalizar OS', 'error');
    }
}

// Criar nova OS (handler seguro)
document.getElementById('orderForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    try {
        const raw = Object.fromEntries(new FormData(form).entries());
        const data = {
            cliente: raw.cliente || '',
            cnpj: raw.cnpj || '',
            endereco: raw.endereco || '',
            servico: raw.servico || '',
            tecnico: currentUser?.nome || 'Técnico',
            preco: parseFloat(raw.preco || 0) || 0,
            status: raw.status || 'Pendente',
            data: new Date().toISOString()
        };

        await database.ref('orders').push(data);
        form.reset();
        closeModal('orderModal');
        showToast('Ordem de Serviço criada!');
        loadOrders();
    } catch (err) {
        console.error('Erro criando OS:', err);
        showToast('Erro ao criar OS', 'error');
    }
});

// Busca em tempo real (se existir campo)
document.getElementById('orderSearch')?.addEventListener('input', () => {
    renderFilteredOrders();
});

// Filtros (se existir conjunto de botões .filter-btn dentro #ordersSection)
document.querySelectorAll('#ordersSection .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#ordersSection .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderFilteredOrders();
    });
});

// Helper: escapeHtml para evitar injeção simples quando colocamos texto direto no innerHTML
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Inicializa lista ao carregar a página
window.addEventListener('load', () => {
    // delay curto para garantir DB inicializado (se necessário)
    setTimeout(() => {
        loadOrders();
    }, 100);
});
async function viewOrder(orderId) {
    try {
        const snapshot = await database.ref(`orders/${orderId}`).once('value');
        const os = snapshot.val();

        if (!os) {
            showToast('OS não encontrada', 'error');
            return;
        }

        const modalHtml = `
      <div id="viewOrderModal" style="
        position:fixed;
        inset:0;
        background:rgba(0,0,0,0.85);
        display:flex;
        align-items:center;
        justify-content:center;
        z-index:9999;
        font-family:Arial,sans-serif;
      ">

        <div style="
          background:#1a1a1a;
          border:2px solid #D4C29A;
          border-radius:10px;
          width:92%;
          max-width:380px;
          color:#f5f5f5;
          box-shadow:0 6px 18px rgba(0,0,0,0.6);
        ">

          <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            padding:8px 12px;
            border-bottom:1px solid rgba(212,194,154,0.15);
          ">
            <h3 style="
              margin:0;
              font-size:0.95rem;
              color:#D4C29A;
            ">
              <i class="fas fa-file-invoice"></i> OS
            </h3>

            <button onclick="closeViewOrderModal()" style="
              background:none;
              border:none;
              color:#D4C29A;
              font-size:1rem;
              cursor:pointer;
            ">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div style="
            padding:10px 12px;
            display:grid;
            grid-template-columns:1fr;
            gap:6px;
            font-size:0.82rem;
          ">
            ${compactLine("Cliente", os.cliente)}
            ${compactLine("Serviço", os.servico)}
            ${compactLine("Preço", "R$ " + parseFloat(os.preco || 0).toFixed(2))}
            ${compactLine("Status", os.status)}
            ${compactLine("Data", new Date(os.data).toLocaleDateString('pt-BR'))}
          </div>

          <div style="padding:0 12px 10px;">
            <button onclick="closeViewOrderModal()" style="
              width:100%;
              background:#D4C29A;
              color:#1a1a1a;
              border:none;
              border-radius:8px;
              padding:8px;
              font-size:0.85rem;
              font-weight:bold;
              cursor:pointer;
            ">Fechar</button>
          </div>

        </div>
      </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

    } catch (err) {
        console.error(err);
        showToast('Erro ao abrir a OS', 'error');
    }
}

function compactLine(label, value) {
    value = value || '-';
    return `
    <div style="
      border:1px solid rgba(212,194,154,0.12);
      border-radius:6px;
      padding:6px 8px;
    ">
      <div style="
        font-size:0.68rem;
        color:#D4C29A;
        margin-bottom:2px;
        text-transform:uppercase;
      ">${label}</div>
      <div style="font-size:0.82rem;">${value}</div>
    </div>
  `;
}

function closeViewOrderModal() {
    const modal = document.getElementById('viewOrderModal');
    if (modal) modal.remove();
}
function preencherTecnicoOS() {
    const tecnicoInput = document.getElementById('tecnicoInput');

    if (tecnicoInput && currentUser?.nome) {
        tecnicoInput.value = currentUser.nome;
    }
}

// sempre que abrir o modal
function openModal(id) {
    document.getElementById(id).classList.add('active');

    if (id === 'orderModal') {
        setTimeout(preencherTecnicoOS, 100);
    }
}
// ---------- Helper: preenche campos da nova inspeção -----------
function preencherDadosInspecaoFromObj(obj) {
    if (!obj) return;

    // campos com id (se você já aplicou os ids)
    const mapById = {
        'inspecaoRazao': obj.razao_social || obj.razao || '',
        'inspecaoCnpj': obj.cnpj || '',
        'inspecaoTelefone': obj.telefone || obj.telefone || '',
        'inspecaoResponsavel': obj.responsavel || obj.responsavel || '',
        'inspecaoEndereco': obj.endereco || obj.endereco || ''
    };

    Object.entries(mapById).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    });

    // também preenche pelos name (caso você não tenha colocado ids)
    try {
        const nameMap = {
            'razao_social': obj.razao_social || obj.razao || '',
            'cnpj': obj.cnpj || '',
            'telefone': obj.telefone || '',
            'responsavel': obj.responsavel || '',
            'endereco': obj.endereco || ''
        };

        Object.entries(nameMap).forEach(([name, val]) => {
            const el = document.querySelector(`#inspectionForm [name="${name}"]`);
            if (el) el.value = val;
        });
    } catch (e) {
        // silencioso
    }
}

// Função que tenta preencher com pequenas tentativas (mais robusto em aparelhos lentos)
function preencherDadosInspecao(obj) {
    if (!obj) return;
    // tenta algumas vezes, em intervalos curtos, até preencher
    let attempts = 0;
    const maxAttempts = 6;
    const iv = setInterval(() => {
        attempts++;
        preencherDadosInspecaoFromObj(obj);

        // Se já estiver preenchido ao menos o nome, consideramos ok
        const razaoEl = document.querySelector('#inspectionForm [name="razao_social"], #inspecaoRazao');
        if (razaoEl && razaoEl.value && razaoEl.value.trim().length > 0) {
            clearInterval(iv);
            return;
        }

        if (attempts >= maxAttempts) clearInterval(iv);
    }, 100); // 100ms * 6 = 600ms total de tentativas
}

// ---------- Substitui/estende o listener de cadastro de empresa ----------
const addCompanyForm = document.getElementById('addCompanyForm');

if (addCompanyForm) {
    addCompanyForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const form = e.target;
        const raw = Object.fromEntries(new FormData(form).entries());

        // Apenas salva localmente (não envia para o Firebase)
        const companyData = {
            razao_social: raw.razao_social || '',
            cnpj: raw.cnpj || '',
            telefone: raw.telefone || '',
            responsavel: raw.responsavel || '',
            endereco: raw.endereco || '',
        };

        // guarda para usar na inspeção
        window.ultimaEmpresaCadastrada = companyData;

        // feedback visual
        showToast('Dados carregados para a inspeção!');

        // fecha modal do cadastro
        closeModal('addCompanyModal');

        // limpa form
        form.reset();

        // abre modal da nova inspeção
        openModal('inspectionFormModal');

        // preenche automaticamente no modal da inspeção
        setTimeout(() => {
            preencherDadosInspecao(companyData);
        }, 100);
    });
}
function preencherDadosInspecao(data) {
    if (!data) return;

    const set = (name, value) => {
        const el = document.querySelector(`#inspectionFormModal [name="${name}"]`);
        if (el) el.value = value || '';
    };

    set('razao_social', data.razao_social);
    set('cnpj', data.cnpj);
    set('telefone', data.telefone);
    set('responsavel', data.responsavel);
    set('endereco', data.endereco);
}


// ---------- Se você usa startInspection(companyId) (lista -> iniciar inspeção) ----------
async function startInspection(companyId) {
    try {
        const snapshot = await database.ref(`companies/${companyId}`).once('value');
        const company = snapshot.val();
        if (!company) return showToast('Empresa não encontrada', 'error');

        // guarda para reutilizar
        window.ultimaEmpresaCadastrada = { id: companyId, ...company };

        // abre modal
        openModal('inspectionFormModal');

        // preenche
        setTimeout(() => preencherDadosInspecao(window.ultimaEmpresaCadastrada), 120);
    } catch (err) {
        console.error('startInspection error:', err);
        showToast('Erro ao iniciar inspeção', 'error');
    }
}

// ---------- Se você abrir o modal manualmente, também preenche se última empresa existir ----------
const originalOpenModal = window.openModal || function (id) { document.getElementById(id).classList.add('active'); };
window.openModal = function (id) {
    // chama original (preserva comportamento antigo)
    originalOpenModal(id);

    if (id === 'inspectionFormModal' && window.ultimaEmpresaCadastrada) {
        // espera o modal ficar visível e preenche
        setTimeout(() => preencherDadosInspecao(window.ultimaEmpresaCadastrada), 120);
    }
};
// ==========================
// 🔒 CONTROLE GLOBAL INPUTS NUMBER
// ==========================

document.addEventListener('focusin', function (e) {
    const el = e.target;

    if (el.tagName === 'INPUT' && el.type === 'number') {
        // Remove o "0" ao clicar
        if (el.value === '0') {
            el.value = '';
        }
    }
});

document.addEventListener('input', function (e) {
    const el = e.target;

    if (el.tagName === 'INPUT' && el.type === 'number') {
        // Bloqueia valores negativos
        if (el.value.startsWith('-')) {
            el.value = el.value.replace('-', '');
        }
    }
});

// Garante que ao sair do campo vazio ele vire 0 de novo
document.addEventListener('blur', function (e) {
    const el = e.target;

    if (el.tagName === 'INPUT' && el.type === 'number') {
        if (el.value.trim() === '') {
            el.value = '0';
        }
    }
}, true);
// Remove sugestões de todos os inputs, selects e textareas do site
document.addEventListener('DOMContentLoaded', () => {
    const campos = document.querySelectorAll('input, textarea, select');
    campos.forEach(campo => {
        campo.setAttribute('autocomplete', 'off');
        campo.setAttribute('autocorrect', 'off');
        campo.setAttribute('autocapitalize', 'off');
        campo.setAttribute('spellcheck', 'false');
    });
});