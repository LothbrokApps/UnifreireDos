let quillModGpe = null, quillCostGpe = null;

function formatUnifreireDate(dStr) {
    if (!dStr) return 'N/A';
    if (dStr.includes('/') && dStr.split('/').length >= 4) {
        return dStr; // Ya está formateada
    }
    const d = new Date(dStr);
    if(isNaN(d.getTime())) return dStr;
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}/${pad(d.getHours())}:${pad(d.getMinutes())}`;
}


// =========================================
// QUILL JS INSTANCES
// =========================================
let quillReqSaltillo, quillModSaltillo, quillCostSaltillo;
let quillModMty, quillCostMty;

// =========================================
// AES-256 ENCRYPTION PAYLOAD SECURE
// =========================================
const SECRET_KEY = "UNIFREIRE_SECURE_KEY_2026_!@#";
function encryptPayload(jsonData) {
    try {
        const jsonString = JSON.stringify(jsonData);
        return CryptoJS.AES.encrypt(jsonString, SECRET_KEY).toString();
    } catch(e) { return null; }
}
function decryptPayload(encryptedData) {
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
        return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch(e) { return null; }
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Data Loads
    loadLeads();
    if (typeof loadCareers === 'function') loadCareers();
    if (typeof renderPlantelesAdmin === 'function') renderPlantelesAdmin();
    if (typeof renderCarouselAdmin === 'function') renderCarouselAdmin();
    if (typeof renderPortadasAdmin === 'function') renderPortadasAdmin();
    
    // 2. Load Visit Stats
    const visitCounter = document.getElementById('admin-visit-count');
    if (visitCounter) {
        let localVisits = localStorage.getItem('unifreire_visit_count') || '0';
        visitCounter.innerText = parseInt(localVisits).toLocaleString();
    }

    // 3. Initialize Quill JS correctly
    const style = document.createElement('style');
    style.innerHTML = `
        .ql-editor { min-height: 120px; color: white !important; font-family: 'Poppins', sans-serif; font-size: 1rem; }
        .ql-editor p { margin-bottom: 0.5rem; }
        .ql-editor ul { padding-left: 1.2rem; margin-bottom: 0; }
        .ql-toolbar.ql-snow { background: #f1f1f1 !important; border-radius: 4px 4px 0 0; border-color: rgba(255,255,255,0.2) !important; }
        .ql-container.ql-snow { border-radius: 0 0 4px 4px; border-color: rgba(255,255,255,0.2) !important; }
    `;
    document.head.appendChild(style);

    document.getElementById('ce-title')?.addEventListener('input', syncLivePreview);
    document.getElementById('ce-desc')?.addEventListener('input', syncLivePreview);

    const quillOptions = {
        theme: 'snow',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'color': [] }, { 'background': [] }],
                ['clean']
            ]
        }
    };
    
    try {
        if (typeof Quill !== 'undefined' && document.getElementById('ce-req-saltillo') && !document.querySelector('#ce-req-saltillo .ql-editor')) {
            quillReqSaltillo = new Quill('#ce-req-saltillo', quillOptions);
            quillModSaltillo = new Quill('#ce-mod-saltillo', quillOptions);
            quillCostSaltillo = new Quill('#ce-cost-saltillo', quillOptions);
            quillModMty = new Quill('#ce-mod-mty', quillOptions);
            quillCostMty = new Quill('#ce-cost-mty', quillOptions);
            if (document.getElementById('ce-mod-gpe')) {
                quillModGpe = new Quill('#ce-mod-gpe', quillOptions);
                quillCostGpe = new Quill('#ce-cost-gpe', quillOptions);
            }
            
            [quillReqSaltillo, quillModSaltillo, quillCostSaltillo].forEach(q => {
                q.on('text-change', syncLivePreview);
            });
        }
    } catch(err) {
        console.error("Error inicializando Quill", err);
    }
});


function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    event.target.classList.add('active');
}

let currentPage = 1;
const itemsPerPage = 50;
let allLeads = [];

async function loadLeads() {
    const tbody = document.getElementById('leads-body');
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center;">Cargando registros...</td></tr>`;

    // Local leads
    const leadsRaw = localStorage.getItem('unifreire_leads');
    if (leadsRaw) {
        try { allLeads = JSON.parse(leadsRaw); } catch(e) { allLeads = []; }
    } else {
        allLeads = [];
    }

    try {
        const res = await fetch(GLOBAL_BACKEND_URL + "?action=obtenerLeads");
        const cloudText = await res.text();
        
        // Intentar descifrar si el servidor envió el JSON encriptado (AES-256)
        let cloudLeads = decryptPayload(cloudText);
        
        // Si no está encriptado (retrocompatibilidad), parsear normal
        if (!cloudLeads) {
            try { cloudLeads = JSON.parse(cloudText); } catch(e) {}
        }
        
        if (cloudLeads && Array.isArray(cloudLeads)) {
            // Filter ghost/anonymous leads that come from empty sheet rows
            // AND unconditionally overwrite local leads with cloud source of truth
            // Filtro estricto: Debe tener nombre, telefono, carrera, y no ser anonimo.
            allLeads = cloudLeads.filter(lead => {
                const isAnon = !lead.nombre || lead.nombre.trim() === "" || lead.nombre.toLowerCase().includes("anon");
                const hasPhone = lead.telefono && lead.telefono.trim() !== "";
                const hasCareer = lead.carrera && lead.carrera.trim() !== "";
                return !isAnon && hasPhone && hasCareer;
            });
            
            // Ordenar por fecha descendente (más reciente primero)
            allLeads.sort((a, b) => {
                if(!a.fecha) return 1;
                if(!b.fecha) return -1;
                
                // Tratar de parsear dd/mm/yyyy/hh:mm
                const parseDate = (dStr) => {
                    if(!dStr) return 0;
                    if(dStr.includes('/')) {
                        const parts = dStr.split('/');
                        if(parts.length >= 4) {
                            const [day, month, year, time] = parts;
                            const [hour, min] = time.split(':');
                            return new Date(year, month-1, day, hour, min).getTime();
                        }
                    }
                    return new Date(dStr).getTime();
                };
                
                return parseDate(b.fecha) - parseDate(a.fecha);
            });
            
            // Notification Bell Logic
            const savedCount = parseInt(sessionStorage.getItem('unifreire_last_lead_count') || '0');
            if(savedCount > 0 && allLeads.length > savedCount) {
                const badge = document.getElementById('notif-badge');
                if(badge) {
                    badge.style.display = 'flex';
                    badge.innerText = (allLeads.length - savedCount).toString();
                }
            }
            sessionStorage.setItem('unifreire_last_lead_count', allLeads.length.toString());
            
            
            localStorage.setItem('unifreire_leads', JSON.stringify(allLeads));
        }
    } catch(err) {
        console.error("Usando leads locales", err);
    }
    
    renderLeadsPage();
}

function renderLeadsPage() {
    const tbody = document.getElementById('leads-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const displayCount = document.getElementById('lead-count');
    if (displayCount) displayCount.innerText = allLeads.length;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, allLeads.length);
    const pageLeads = allLeads.slice(startIndex, endIndex);
    
    if (pageLeads.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center;">No hay registros de leads.</td></tr>`;
    }

    pageLeads.forEach(lead => {
        let plant = lead.plantel || 'Saltillo';
        let badge = plant.toLowerCase() === 'monterrey' 
                    ? `<span style="background:var(--unifreire-blue); color:white; padding:2px 6px; border-radius:4px; font-size:0.7rem;">MTY</span>` 
                    : `<span style="background:var(--unifreire-green); color:white; padding:2px 6px; border-radius:4px; font-size:0.7rem;">SALT</span>`;
                    
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${lead.nombre}</td>
            <td><a href="https://wa.me/52${lead.telefono}" target="_blank" style="color:var(--unifreire-yellow); text-decoration:none;">${lead.telefono}</a></td>
            <td>${lead.carrera || 'N/A'} ${badge}</td>
            <td>${lead.nivel || 'N/A'}</td>
            <td>${formatUnifreireDate(lead.fecha)}</td>
        `;
        tbody.appendChild(tr);
    });
    
    // Add pagination controls
    const totalPages = Math.ceil(allLeads.length / itemsPerPage);
    if (totalPages > 1) {
        let tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="5" style="text-align: center; padding: 1rem;">
            <button onclick="if(currentPage > 1) { currentPage--; renderLeadsPage(); }" style="padding: 0.5rem; background: var(--unifreire-yellow); color: black; border: none; cursor: pointer; margin-right: 10px; border-radius: 4px;">Anterior</button>
            <span style="color: white;">Página ${currentPage} de ${totalPages}</span>
            <button onclick="if(currentPage < ${totalPages}) { currentPage++; renderLeadsPage(); }" style="padding: 0.5rem; background: var(--unifreire-yellow); color: black; border: none; cursor: pointer; margin-left: 10px; border-radius: 4px;">Siguiente</button>
        </td>`;
        tbody.appendChild(tr);
    }
}


async function guardarConfigEnNube(llave, valor, msgElement) {
    if(msgElement) msgElement.innerText = "Guardando en la nube... espera.";
    const params = new URLSearchParams({
        action: "guardarConfig",
        llave: llave,
        valor: valor
    });
    try {
        await fetch(GLOBAL_BACKEND_URL, { 
            method: "POST", 
            body: params,
            mode: "no-cors"
        });
        if(msgElement) msgElement.innerText = "¡Sincronizado con éxito en la nube!";
    } catch(err) {
        if(msgElement) msgElement.innerText = "Error de conexión, guardado solo localmente.";
    }
    setTimeout(() => { if(msgElement) msgElement.innerText=""; }, 3000);
}



function updateCareerBanner(id) {
    const msg = document.getElementById(`msg-${id}`);
    const input = document.getElementById(`url-${id}`);
    if (!input) return;
    const rawUrl = input.value.trim();
    if(!rawUrl) { if(msg) msg.innerText = "Ingresa un enlace."; return; }
    const directUrl = typeof getDirectUrl === 'function' ? getDirectUrl(rawUrl) : rawUrl;
    
    // Guardar ÚNICAMENTE en banner (100% independiente de portada)
    localStorage.setItem(`unifreire_banner_${id}`, directUrl);
    localStorage.setItem('unifreire_cache_version', Date.now().toString());

    // Actualizar vista previa en el panel
    const preview = document.getElementById(`preview-banner-${id}`);
    if (preview) {
        preview.style.backgroundImage = `url('${directUrl}')`;
    }
    
    if(typeof guardarConfigEnNube === 'function') {
        guardarConfigEnNube(`unifreire_banner_${id}`, directUrl, msg);
    }
    if(msg) msg.innerText = "¡Banner guardado!";
    setTimeout(() => { if(msg && msg.innerText.includes("¡Banner")) msg.innerText = ""; }, 3000);
}

document.addEventListener('dragover', (e) => {
    e.preventDefault();
    let dz = e.target.closest('.drop-zone');
    if(dz) dz.classList.add('dragover');
});
document.addEventListener('dragleave', (e) => {
    e.preventDefault();
    let dz = e.target.closest('.drop-zone');
    if(dz) dz.classList.remove('dragover');
});
document.addEventListener('drop', (e) => {
    e.preventDefault();
    let dz = e.target.closest('.drop-zone');
    if(dz) {
        dz.classList.remove('dragover');
        if(e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            const input = dz.querySelector('input[type="file"]');
            if(input) {
                if(input.id === 'hero-banner-input') {
                    updateHeroBanner(file);
                } else {
                    const id = input.id.replace('file-', '');
                    updateCareerBanner(id, file);
                }
            }
        }
    }
});


async function limpiarYExportar() {
    exportExcel();
    if(confirm('¿Estás seguro de que deseas limpiar la base de datos de leads local y en la nube? Esta acción no se puede deshacer.')) {
        localStorage.removeItem('unifreire_leads');
        try {
            await fetch(GLOBAL_BACKEND_URL + "?action=limpiarLeads", { method: "POST", mode: "no-cors" });
        } catch(e) {}
        alert('Leads limpiados localmente y en la nube.');
        loadLeads();
    }
}

function exportExcel() {
    // Basic CSV mock functionality
    const leadsRaw = localStorage.getItem('unifreire_leads');
    if(!leadsRaw) {
        alert("No hay leads para exportar.");
        return;
    }

    const leads = JSON.parse(leadsRaw);
    let csvContent = "data:text/csv;charset=utf-8,Nombre,Carrera,Telefono,Email,Nivel,Horario,Fecha\n";

    leads.forEach(l => {
        const row = [l.nombre, l.carrera, l.telefono, l.email, l.nivel, l.horario, l.fecha].join(",");
        csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "unifreire_leads.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
}

// Carousel Logic & Drag and Drop Reordering
let draggedCarouselIdx = null;

function onCarouselDragStart(e, idx) {
    draggedCarouselIdx = idx;
    e.dataTransfer.setData('text/plain', idx);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.4';
}

function onCarouselDragEnd(e) {
    e.currentTarget.style.opacity = '1';
    draggedCarouselIdx = null;
    document.querySelectorAll('.carousel-admin-card').forEach(el => {
        el.style.borderColor = 'var(--glass-border)';
        el.style.transform = 'scale(1)';
    });
}

function onCarouselDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function onCarouselDragEnter(e) {
    e.preventDefault();
    const card = e.currentTarget;
    card.style.borderColor = 'var(--unifreire-yellow)';
    card.style.transform = 'scale(1.03)';
}

function onCarouselDragLeave(e) {
    const card = e.currentTarget;
    card.style.borderColor = 'var(--glass-border)';
    card.style.transform = 'scale(1)';
}

function onCarouselDrop(e, targetIdx) {
    e.preventDefault();
    const card = e.currentTarget;
    card.style.borderColor = 'var(--glass-border)';
    card.style.transform = 'scale(1)';
    const fromIdx = draggedCarouselIdx !== null ? draggedCarouselIdx : parseInt(e.dataTransfer.getData('text/plain'), 10);
    draggedCarouselIdx = null;
    if (!isNaN(fromIdx) && fromIdx !== targetIdx) {
        reorderCarouselPics(fromIdx, targetIdx);
    }
}

function moveCarouselPic(fromIdx, direction) {
    const toIdx = fromIdx + direction;
    reorderCarouselPics(fromIdx, toIdx);
}

function reorderCarouselPics(fromIdx, toIdx) {
    let pics = JSON.parse(localStorage.getItem('unifreire_carousel_images') || '[]');
    if (fromIdx < 0 || fromIdx >= pics.length || toIdx < 0 || toIdx >= pics.length) return;
    const [item] = pics.splice(fromIdx, 1);
    pics.splice(toIdx, 0, item);
    localStorage.setItem('unifreire_carousel_images', JSON.stringify(pics));
    renderCarouselAdmin();
    guardarConfigEnNube('unifreire_carousel_images', JSON.stringify(pics), null);
}

function renderCarouselAdmin() {
    const grid = document.getElementById('carousel-preview-grid');
    if(!grid) return;

    let pics = [];
    try {
        pics = JSON.parse(localStorage.getItem('unifreire_carousel_images') || '[]');
    } catch(e) { pics = []; }

    // Filtrar entradas nulas o vacías
    pics = pics.filter(p => p && typeof p === 'string' && p.trim() !== "");

    if(pics.length === 0) {
        grid.innerHTML = '<p style="color:gray; padding: 1rem;">No hay fotografías subidas. Se mostrará el carrusel predeterminado.</p>';
        return;
    }
    
    let h = '';
    pics.forEach((p, idx) => {
        const direct = getDirectUrl(p);
        h += `
            <div class="card glass carousel-admin-card" draggable="true" ondragstart="onCarouselDragStart(event, ${idx})" ondragend="onCarouselDragEnd(event)" ondragover="onCarouselDragOver(event)" ondragenter="onCarouselDragEnter(event)" ondragleave="onCarouselDragLeave(event)" ondrop="onCarouselDrop(event, ${idx})" style="padding: 0; overflow: hidden; position: relative; border-radius: 12px; background: rgba(0,0,0,0.6); min-height: 170px; border: 1px solid var(--glass-border); cursor: grab; transition: transform 0.2s, border-color 0.2s;">
                <img src="${direct}" alt="Foto ${idx+1}" referrerpolicy="no-referrer" loading="lazy" style="width: 100%; height: 160px; object-fit: cover; display: block; pointer-events: none;" onerror="this.onerror=null; this.src='assets/images/hero_bg.webp'; this.parentElement.querySelector('.badge-broken')?.style.removeProperty('display');">
                
                <div style="position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,0.75); color: var(--unifreire-yellow); font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 6px; z-index: 5; pointer-events: none; border: 1px solid rgba(255,184,28,0.4);">
                    ☰ #${idx + 1}
                </div>

                <div class="badge-broken" style="display:none; position:absolute; bottom:40px; left:6px; background:rgba(231,76,60,0.9); color:white; font-size:10px; font-weight:bold; padding:2px 8px; border-radius:4px; z-index:5;">
                    ⚠️ Enlace roto / no disponible
                </div>

                <div style="position: absolute; bottom: 6px; left: 6px; right: 6px; display: flex; justify-content: space-between; align-items: center; z-index: 5;">
                    <div style="display: flex; gap: 4px;">
                        <button type="button" onclick="moveCarouselPic(${idx}, -1)" ${idx === 0 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''} title="Mover a la izquierda" class="btn-primary" style="padding: 2px 8px; font-size: 11px; border-radius: 4px; background: rgba(0,77,54,0.85);">◀</button>
                        <button type="button" onclick="moveCarouselPic(${idx}, 1)" ${idx === pics.length - 1 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''} title="Mover a la derecha" class="btn-primary" style="padding: 2px 8px; font-size: 11px; border-radius: 4px; background: rgba(0,77,54,0.85);">▶</button>
                    </div>
                    <span style="font-size: 10px; color: rgba(255,255,255,0.7); background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 4px;">Arrastra para reordenar</span>
                </div>

                <button type="button" onclick="deleteCarouselPic(${idx})" title="Eliminar Fotografía" style="position:absolute; top:8px; right:8px; background:#e74c3c; color:white; border:none; width:30px; height:30px; border-radius:50%; font-weight:bold; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 8px rgba(0,0,0,0.6); z-index:10; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
                    ✕
                </button>
            </div>
        `;
    });
    grid.innerHTML = h;
}

function cleanBrokenCarouselPics() {
    let pics = [];
    try {
        pics = JSON.parse(localStorage.getItem('unifreire_carousel_images') || '[]');
    } catch(e) { pics = []; }

    const initialCount = pics.length;
    // Limpiar entradas vacías o URLs no válidas
    pics = pics.filter(p => p && typeof p === 'string' && p.trim().length > 10 && (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('assets/')));

    localStorage.setItem('unifreire_carousel_images', JSON.stringify(pics));
    renderCarouselAdmin();
    guardarConfigEnNube('unifreire_carousel_images', JSON.stringify(pics), null);
    alert(`Limpieza completada. ${initialCount - pics.length} elementos inválidos fueron eliminados.`);
}

function deleteCarouselPic(idx) {
    if(!confirm("¿Eliminar fotografía?")) return;
    const pics = JSON.parse(localStorage.getItem('unifreire_carousel_images') || '[]');
    pics.splice(idx, 1);
    localStorage.setItem('unifreire_carousel_images', JSON.stringify(pics));
    renderCarouselAdmin();
    guardarConfigEnNube('unifreire_carousel_images', JSON.stringify(pics), null);
}

function addCarouselUrl() {
    const input = document.getElementById('carousel-url-input');
    const url = input.value.trim();
    const msg = document.getElementById('carousel-upload-msg');
    
    if(!url) {
        msg.innerText = "Por favor ingresa un enlace directo.";
        setTimeout(() => msg.innerText="", 3000);
        return;
    }
    
    let pics = JSON.parse(localStorage.getItem('unifreire_carousel_images') || '[]');
    pics.push(url);
    
    localStorage.setItem('unifreire_carousel_images', JSON.stringify(pics));
    input.value = '';
    renderCarouselAdmin();
    guardarConfigEnNube('unifreire_carousel_images', JSON.stringify(pics), msg);
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Data Loads
    loadLeads();
    if (typeof loadCareers === 'function') loadCareers();
    if (typeof renderPlantelesAdmin === 'function') renderPlantelesAdmin();
    if (typeof renderCarouselAdmin === 'function') renderCarouselAdmin();
    if (typeof renderPortadasAdmin === 'function') renderPortadasAdmin();
    
    // 2. Load Visit Stats
    const visitCounter = document.getElementById('admin-visit-count');
    if (visitCounter) {
        let localVisits = localStorage.getItem('unifreire_visit_count') || '0';
        visitCounter.innerText = parseInt(localVisits).toLocaleString();
    }

    // 3. Initialize Quill JS correctly
    const style = document.createElement('style');
    style.innerHTML = `
        .ql-editor { min-height: 120px; color: white !important; font-family: 'Poppins', sans-serif; font-size: 1rem; }
        .ql-editor p { margin-bottom: 0.5rem; }
        .ql-editor ul { padding-left: 1.2rem; margin-bottom: 0; }
        .ql-toolbar.ql-snow { background: #f1f1f1 !important; border-radius: 4px 4px 0 0; border-color: rgba(255,255,255,0.2) !important; }
        .ql-container.ql-snow { border-radius: 0 0 4px 4px; border-color: rgba(255,255,255,0.2) !important; }
    `;
    document.head.appendChild(style);

    document.getElementById('ce-title')?.addEventListener('input', syncLivePreview);
    document.getElementById('ce-desc')?.addEventListener('input', syncLivePreview);

    const quillOptions = {
        theme: 'snow',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'color': [] }, { 'background': [] }],
                ['clean']
            ]
        }
    };
    
    try {
        if (typeof Quill !== 'undefined' && document.getElementById('ce-req-saltillo') && !document.querySelector('#ce-req-saltillo .ql-editor')) {
            quillReqSaltillo = new Quill('#ce-req-saltillo', quillOptions);
            quillModSaltillo = new Quill('#ce-mod-saltillo', quillOptions);
            quillCostSaltillo = new Quill('#ce-cost-saltillo', quillOptions);
            quillModMty = new Quill('#ce-mod-mty', quillOptions);
            quillCostMty = new Quill('#ce-cost-mty', quillOptions);
            if (document.getElementById('ce-mod-gpe')) {
                quillModGpe = new Quill('#ce-mod-gpe', quillOptions);
                quillCostGpe = new Quill('#ce-cost-gpe', quillOptions);
            }
            
            [quillReqSaltillo, quillModSaltillo, quillCostSaltillo].forEach(q => {
                q.on('text-change', syncLivePreview);
            });
        }
    } catch(err) {
        console.error("Error inicializando Quill", err);
    }
});


// --- Career Editor Logic ---
let currentEditingCareerId = null;


function loadCareers() {
    const grid = document.getElementById('admin-careers-grid');
    const bannerGrid = document.getElementById('admin-campanas-banners-grid');
    if(!grid && !bannerGrid) return;
    
    let html = '';
    let bannerHtml = '';
    Object.values(CAREERS_DATA).forEach(c => {
        // Admin tab
        if(grid) {
            html += `
                <div class="card glass" style="min-height: 150px; padding: 1rem;">
                    <div style="font-size: 0.8rem; color: var(--unifreire-yellow);">${c.type}</div>
                    <h4 style="margin: 0.5rem 0;">${c.name}</h4>
                    <div style="display:flex; gap:0.5rem; margin-top: 1rem;">
                        <button class="btn-primary" style="padding: 0.3rem 0.5rem; font-size: 0.8rem;" onclick="openCareerEditor('${c.id}')">Editar Plan</button>
                    </div>
                </div>
            `;
        }

        // Banners tab
        if(bannerGrid) {
            const savedBanner = localStorage.getItem(`unifreire_banner_${c.id}`) || c.defaultBanner || '';
            const previewUrl = typeof getDirectUrl === 'function' ? getDirectUrl(savedBanner) : savedBanner;
            bannerHtml += `
                <div class="card glass" style="min-height: 150px; padding: 1.2rem; border-radius: 14px; display: flex; flex-direction: column;">
                    <div style="font-size: 0.8rem; color: var(--unifreire-yellow); font-weight: 600; text-transform: uppercase;">${c.type}</div>
                    <h4 style="margin: 0.5rem 0 0.8rem 0; font-size: 1.1rem; color: white;">${c.name}</h4>
                    
                    <div id="preview-banner-${c.id}" style="width: 100%; height: 110px; border-radius: 8px; background: url('${previewUrl}') center/cover no-repeat; border: 1px solid rgba(255,255,255,0.15); margin-bottom: 0.8rem;"></div>

                    <div style="margin-top: auto;">
                       <input type="text" id="url-${c.id}" value="${savedBanner}" placeholder="Enlace directo Google Drive o URL" style="width: 100%; padding: 0.55rem; border-radius: 6px; border: 1px solid var(--glass-border); background: var(--bg-dark); color: white; font-size: 0.8rem; margin-bottom: 0.5rem; box-sizing: border-box;">
                       <div style="display: flex; gap: 0.5rem;">
                           <button class="btn-primary" style="flex: 1; font-size: 0.8rem; padding: 0.45rem;" onclick="openCareerBannerAdjuster('${c.id}')">Ajustar Encuadre</button>
                           <button class="btn-accent" style="flex: 1; font-size: 0.8rem; padding: 0.45rem;" onclick="updateCareerBanner('${c.id}')">Guardar</button>
                       </div>
                    </div>
                    <p id="msg-${c.id}" style="color: var(--unifreire-yellow); font-size: 0.8rem; margin-top: 0.5rem; text-align: center; min-height: 1.2rem; margin-bottom:0;"></p>
                </div>
            `;
        }
    });

    if(grid) grid.innerHTML = html;
    if(bannerGrid) bannerGrid.innerHTML = bannerHtml;
}


function openCareerEditor(careerId) {
    currentEditingCareerId = careerId;
    const c = CAREERS_DATA[careerId];
    if(!c) return;

    // Load overrides if any
    let overrides = {};
    try {
        const stored = localStorage.getItem('unifreire_careers_custom');
        if(stored) overrides = JSON.parse(stored);
    } catch(e) {}

    const custom = overrides[careerId] || {};

    document.getElementById('ce-career-id').innerText = custom.name || c.name;
    document.getElementById('ce-title').value = custom.name || c.name;
    document.getElementById('ce-desc').value = custom.description || c.description;
    
    // Default flags (true if not set)
    document.getElementById('ce-flag-saltillo').checked = custom.availableSaltillo !== false;
    document.getElementById('ce-flag-mty').checked = custom.availableMonterrey !== false;


    // Default HTML blocks if custom is not set
    const reqS = (custom.saltillo ? custom.saltillo.requisitos : null) || `<p style="margin-bottom: 0.5rem; margin-top: 1rem;">Para realizar tu inscripción necesitas:</p><ul style="margin-bottom: 0; padding-left: 1.2rem;"><li>Acta de Nacimiento</li><li>Certificado de Bachillerato</li><li>Carta de Autenticidad</li><li>CURP</li><li>Pago del Seguro Facultativo</li><li>Comprobante de Domicilio</li><li>Identificación Oficial (INE)</li></ul>`;
    const modS = (custom.saltillo ? custom.saltillo.modalidades : null) || `<ul style="margin-bottom: 0; padding-left: 1.2rem;"><li><b>Matutino:</b> 7:00 am a 10:00 am</li><li><b>Vespertino:</b> 6:00 pm a 9:00 pm</li><li><b>Intermedio:</b> 10:30 am a 1:30 pm</li><li><b>Turno Mixto:</b> Sábado o Domingo 8:00 am a 3:00 pm</li></ul>`;
    const costS = (custom.saltillo ? custom.saltillo.costos : null) || `<p style="margin-bottom: 0.5rem; color: var(--unifreire-yellow);"><b>Licenciaturas:</b></p><ul style="margin-bottom: 1rem; padding-left: 1.2rem;"><li>Escolarizados (Lunes a Viernes) $1,820</li><li>Mixto (Sábado y Domingo) $1,920</li></ul><p style="margin-bottom: 0.5rem; color: var(--unifreire-yellow);"><b>Ingenierías:</b></p><ul style="margin-bottom: 0; padding-left: 1.2rem;"><li>Escolarizados (Lunes a Viernes) $2,100</li><li>Mixto (Sábado y Domingo) $2,200</li></ul>`;
    const modM = (custom.monterrey ? custom.monterrey.modalidades : null) || `<ul style="margin-bottom: 0; padding-left: 1.2rem;"><li><b>MATUTINO:</b> LUNES A VIERNES 8:00AM A 11:00AM</li><li><b>SABATINO:</b> 8:00AM A 3:00PM</li><li><b>DOMINICAL:</b> 8:00AM A 3:00PM</li></ul>`;
    const costM = (custom.monterrey ? custom.monterrey.costos : null) || `<ul style="margin-bottom: 0; padding-left: 1.2rem;"><li>Inscripción $2,000</li><li>Mensualidad $2,000</li><li>Cuota interna $500</li><li>Seguro facultativo $1,250</li></ul>`;

    if(quillReqSaltillo) quillReqSaltillo.root.innerHTML = reqS; else document.getElementById('ce-req-saltillo').innerHTML = reqS;
    if(quillModSaltillo) quillModSaltillo.root.innerHTML = modS; else document.getElementById('ce-mod-saltillo').innerHTML = modS;
    if(quillCostSaltillo) quillCostSaltillo.root.innerHTML = costS; else document.getElementById('ce-cost-saltillo').innerHTML = costS;
    if(quillModMty) quillModMty.root.innerHTML = modM; else document.getElementById('ce-mod-mty').innerHTML = modM;
    if(quillCostMty) quillCostMty.root.innerHTML = costM; else document.getElementById('ce-cost-mty').innerHTML = costM;

    document.getElementById('careerEditorModal').style.display = 'flex';
    syncLivePreview();

}

function saveCareerChanges() {
    if(!currentEditingCareerId) return;

    let overrides = {};
    try {
        const stored = localStorage.getItem('unifreire_careers_custom');
        if(stored) overrides = JSON.parse(stored);
    } catch(e) {}

    overrides[currentEditingCareerId] = {
        name: document.getElementById('ce-title').value,
        description: document.getElementById('ce-desc').value,
        availableSaltillo: document.getElementById('ce-flag-saltillo').checked,
        availableMonterrey: document.getElementById('ce-flag-mty').checked,
        saltillo: {
            requisitos: quillReqSaltillo ? quillReqSaltillo.root.innerHTML : document.getElementById('ce-req-saltillo').innerHTML,
            modalidades: quillModSaltillo ? quillModSaltillo.root.innerHTML : document.getElementById('ce-mod-saltillo').innerHTML,
            costos: quillCostSaltillo ? quillCostSaltillo.root.innerHTML : document.getElementById('ce-cost-saltillo').innerHTML
        },
        monterrey: {
            modalidades: quillModMty ? quillModMty.root.innerHTML : document.getElementById('ce-mod-mty').innerHTML,
            costos: quillCostMty ? quillCostMty.root.innerHTML : document.getElementById('ce-cost-mty').innerHTML
        },
        availableGuadalupe: document.getElementById('ce-flag-guadalupe') ? document.getElementById('ce-flag-guadalupe').checked : true,
        guadalupe: {
            modalidades: quillModGpe ? quillModGpe.root.innerHTML : (document.getElementById('ce-mod-gpe') ? document.getElementById('ce-mod-gpe').innerHTML : ''),
            costos: quillCostGpe ? quillCostGpe.root.innerHTML : (document.getElementById('ce-cost-gpe') ? document.getElementById('ce-cost-gpe').innerHTML : '')
        }
    };

    localStorage.setItem('unifreire_careers_custom', JSON.stringify(overrides));
    // Disparar limpiador de caché global (Cache Buster)
    localStorage.setItem('unifreire_cache_version', Date.now().toString());

    alert('Cambios guardados localmente. Al cargar la carrera se reflejará esta información.');
    document.getElementById('careerEditorModal').style.display = 'none';
    renderCareersTab(); // Refresh list to show updated name
}


// ==================== PLANTELES LOGIC ====================
const DEFAULT_PLANTELES_ADMIN = [
    { nombre: "Plantel Centro", ubicacion: "📍 José María Arteaga 240<br>Zona Centro, Saltillo, Coah.", telefono: "📲 (844) 410-5762", liga: "https://maps.app.goo.gl/tbLyqT6qCdnmW3in6" },
    { nombre: "Plantel Matamoros", ubicacion: "📍 Mariano Matamoros 766<br>Zona Centro, Saltillo, Coah.", telefono: "📲 (844) 726-0527", liga: "https://maps.app.goo.gl/L3NqmizFhWFZWsFw9" },
    { nombre: "Plantel Sur", ubicacion: "📍 Calle 2 #2648, esq. Blvd. Hidalgo<br>Fracc. Miguel Hidalgo, Saltillo, Coah.", telefono: "📲 (844) 112-4654", liga: "https://maps.app.goo.gl/v49aGjP2VZUDNmpSA" },
    { nombre: "Plantel Monterrey", ubicacion: "📍 Albino Espinosa Ote 324<br>entre Galeana y E. Carranza, N.L.", telefono: "📲 (81) 163-70651", liga: "https://maps.app.goo.gl/fEiJBCyAh1eWbuLt7" }
];

function getPlanteles() {
    let planteles = DEFAULT_PLANTELES_ADMIN;
    try {
        const custom = localStorage.getItem('unifreire_planteles_custom');
        if (custom) planteles = JSON.parse(custom);
    } catch(e) {}
    return planteles;
}

function renderPlantelesAdmin() {
    const tbody = document.getElementById('planteles-admin-body');
    if (!tbody) return;
    
    const planteles = getPlanteles();
    if (planteles.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center;">No hay planteles.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = planteles.map((p, index) => `
        <tr>
            <td>${p.nombre}</td>
            <td>${p.ubicacion}</td>
            <td>${p.telefono}</td>
            <td>
                <button onclick="openPlantelEditor(${index})" class="btn-primary" style="padding: 0.3rem 0.8rem; font-size: 0.8rem;">Editar</button>
            </td>
        </tr>
    `).join('');
}

function openPlantelEditor(index) {
    const planteles = getPlanteles();
    document.getElementById('pe-id').value = index;
    
    if (index === -1) {
        document.getElementById('pe-modal-title').innerText = "Agregar Plantel";
        document.getElementById('pe-nombre').value = "";
        document.getElementById('pe-ubicacion').value = "";
        document.getElementById('pe-telefono').value = "";
        document.getElementById('pe-liga').value = "";
        document.getElementById('pe-btn-delete').style.display = "none";
    } else {
        const p = planteles[index];
        document.getElementById('pe-modal-title').innerText = "Editar Plantel";
        document.getElementById('pe-nombre').value = p.nombre;
        document.getElementById('pe-ubicacion').value = p.ubicacion;
        document.getElementById('pe-telefono').value = p.telefono;
        document.getElementById('pe-liga').value = p.liga;
        document.getElementById('pe-btn-delete').style.display = "block";
    }
    
    document.getElementById('plantelEditorModal').style.display = 'flex';
}

function savePlantel() {
    const planteles = getPlanteles();
    const index = parseInt(document.getElementById('pe-id').value);
    
    const nuevo = {
        nombre: document.getElementById('pe-nombre').value,
        ubicacion: document.getElementById('pe-ubicacion').value,
        telefono: document.getElementById('pe-telefono').value,
        liga: document.getElementById('pe-liga').value
    };
    
    if (index === -1) {
        planteles.push(nuevo);
    } else {
        planteles[index] = nuevo;
    }
    
    localStorage.setItem('unifreire_planteles_custom', JSON.stringify(planteles));
    // Disparar limpiador de caché global (Cache Buster)
    localStorage.setItem('unifreire_cache_version', Date.now().toString());

    renderPlantelesAdmin();
    document.getElementById('plantelEditorModal').style.display = 'none';
    alert("Plantel guardado exitosamente. Se reflejará en la web automáticamente.");
}

function deletePlantel() {
    if(!confirm("¿Estás seguro de eliminar este plantel?")) return;
    
    const index = parseInt(document.getElementById('pe-id').value);
    if(index === -1) return;
    
    const planteles = getPlanteles();
    planteles.splice(index, 1);
    
    localStorage.setItem('unifreire_planteles_custom', JSON.stringify(planteles));
    // Disparar limpiador de caché global (Cache Buster)
    localStorage.setItem('unifreire_cache_version', Date.now().toString());

    renderPlantelesAdmin();
    document.getElementById('plantelEditorModal').style.display = 'none';
}


// =========================================
// HERO BANNER ADJUSTER
// =========================================
// UNIVERSAL IMAGE ADJUSTER (HERO, BANNERS Y PORTADAS)
// =========================================
let currentAdjustMode = 'hero'; // 'hero' | 'career_banner' | 'career_portada'
let currentAdjustCareerId = null;
let currentAdjustUrl = '';

function openHeroAdjuster() {
    const url = document.getElementById('hero-url-input').value.trim();
    const msg = document.getElementById('hero-banner-msg');
    if(!url) {
        if (msg) msg.innerText = "Por favor ingresa un enlace."; 
        return; 
    }
    
    currentAdjustMode = 'hero';
    currentAdjustCareerId = null;
    currentAdjustUrl = getDirectUrl(url);

    setupAdjusterModal("Ajustar Encuadre: Hero Banner Principal", "banner", currentAdjustUrl, 100, 50, 50);
}

function openCareerBannerAdjuster(careerId) {
    const c = (typeof CAREERS_DATA !== 'undefined') ? CAREERS_DATA[careerId] : null;
    const input = document.getElementById(`url-${careerId}`);
    const rawUrl = (input && input.value.trim()) || localStorage.getItem(`unifreire_banner_${careerId}`) || (c ? c.defaultBanner : '');
    const msg = document.getElementById(`msg-${careerId}`);
    
    if(!rawUrl) {
        if(msg) msg.innerText = "Por favor ingresa un enlace.";
        return;
    }

    currentAdjustMode = 'career_banner';
    currentAdjustCareerId = careerId;
    currentAdjustUrl = getDirectUrl(rawUrl);

    const savedPos = localStorage.getItem(`unifreire_banner_pos_${careerId}`) || '50% 50%';
    const savedZoom = localStorage.getItem(`unifreire_banner_zoom_${careerId}`) || '100%';
    const parts = savedPos.split(' ');
    const posX = parseInt(parts[0]) || 50;
    const posY = parseInt(parts[1]) || 50;
    const zoomVal = parseInt(savedZoom) || 100;

    const careerTitle = c ? c.name : careerId;
    setupAdjusterModal(`Ajustar Banner de Carrera: ${careerTitle}`, "banner", currentAdjustUrl, zoomVal, posX, posY);
}

function openCareerPortadaAdjuster(careerId) {
    const c = (typeof CAREERS_DATA !== 'undefined') ? CAREERS_DATA[careerId] : null;
    const input = document.getElementById(`url-portada-${careerId}`);
    const rawUrl = (input && input.value.trim()) || localStorage.getItem(`unifreire_portada_${careerId}`) || (c ? (c.defaultPortada || c.defaultBanner) : '');
    const msg = document.getElementById(`msg-portada-${careerId}`);
    
    if(!rawUrl) {
        if(msg) msg.innerText = "Por favor ingresa un enlace.";
        return;
    }

    currentAdjustMode = 'career_portada';
    currentAdjustCareerId = careerId;
    currentAdjustUrl = getDirectUrl(rawUrl);

    const savedPos = localStorage.getItem(`unifreire_portada_pos_${careerId}`) || '50% 50%';
    const savedZoom = localStorage.getItem(`unifreire_portada_zoom_${careerId}`) || '100%';
    const parts = savedPos.split(' ');
    const posX = parseInt(parts[0]) || 50;
    const posY = parseInt(parts[1]) || 50;
    const zoomVal = parseInt(savedZoom) || 100;

    const careerTitle = c ? c.name : careerId;
    setupAdjusterModal(`Ajustar Foto de Portada (Tarjeta Home): ${careerTitle}`, "portada", currentAdjustUrl, zoomVal, posX, posY);
}

function setupAdjusterModal(titleText, aspectType, directUrl, zoomVal, posX, posY) {
    const modalTitle = document.getElementById('image-modal-title');
    if (modalTitle) modalTitle.innerText = titleText;

    const previewBox = document.getElementById('img-preview-box');
    if (previewBox) {
        if (aspectType === 'portada') {
            previewBox.style.width = '260px';
            previewBox.style.height = '340px';
            previewBox.style.maxWidth = '90vw';
        } else {
            previewBox.style.width = '90%';
            previewBox.style.height = '250px';
            previewBox.style.maxWidth = '900px';
        }
    }

    document.getElementById('scale-z').value = zoomVal || 100;
    document.getElementById('pos-x').value = posX || 50;
    document.getElementById('pos-y').value = posY || 50;

    const preview = document.getElementById('img-preview');
    if (preview) {
        preview.innerHTML = '';
        const isVideo = directUrl.endsWith('.mp4') || directUrl.endsWith('.webm') || directUrl.includes('/video/upload/');
        if (isVideo) {
            preview.style.backgroundImage = 'none';
            preview.innerHTML = `<video src="${directUrl}" autoplay muted loop playsinline style="width:100%; height:100%; object-fit:cover;"></video>`;
        } else {
            preview.style.backgroundImage = `url('${directUrl}')`;
            preview.style.backgroundSize = `${zoomVal || 100}%`;
            preview.style.backgroundPosition = `${posX || 50}% ${posY || 50}%`;
        }
    }

    document.getElementById('image-modal').style.display = 'flex';
}

function closeImageAdjuster() {
    const modal = document.getElementById('image-modal');
    if (modal) modal.style.display = 'none';
}

function updatePreviewStyle() {
    const z = document.getElementById('scale-z').value;
    const x = document.getElementById('pos-x').value;
    const y = document.getElementById('pos-y').value;
    
    const preview = document.getElementById('img-preview');
    if (preview) {
        preview.style.backgroundSize = `${z}%`;
        preview.style.backgroundPosition = `${x}% ${y}%`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('scale-z')?.addEventListener('input', updatePreviewStyle);
    document.getElementById('pos-x')?.addEventListener('input', updatePreviewStyle);
    document.getElementById('pos-y')?.addEventListener('input', updatePreviewStyle);
});

function saveAdjustedImage() {
    const z = document.getElementById('scale-z').value;
    const scale = z / 100;
    const x = document.getElementById('pos-x').value;
    const y = document.getElementById('pos-y').value;
    const posStr = `${x}% ${y}%`;
    const zoomStr = `${z}%`;
    const directUrl = getDirectUrl(currentAdjustUrl);

    // Cache buster global
    localStorage.setItem('unifreire_cache_version', Date.now().toString());

    if (currentAdjustMode === 'hero') {
        const config = {
            url: directUrl,
            scale: scale,
            position: posStr
        };
        localStorage.setItem('unifreire_hero_banner', JSON.stringify(config));
        const msg = document.getElementById('hero-banner-msg');
        if (msg) msg.innerText = "Hero Banner ajustado y guardado exitosamente.";
        if (typeof guardarConfigEnNube === 'function') {
            guardarConfigEnNube('unifreire_hero_banner', JSON.stringify(config), msg);
        }
    } else if (currentAdjustMode === 'career_banner') {
        const id = currentAdjustCareerId;
        // Guardar SOLO en banner (100% independiente de portada)
        localStorage.setItem(`unifreire_banner_${id}`, directUrl);
        localStorage.setItem(`unifreire_banner_pos_${id}`, posStr);
        localStorage.setItem(`unifreire_banner_zoom_${id}`, zoomStr);

        const preview = document.getElementById(`preview-banner-${id}`);
        if (preview) {
            preview.style.backgroundImage = `url('${directUrl}')`;
        }

        const msg = document.getElementById(`msg-${id}`);
        if (msg) msg.innerText = "¡Banner de carrera ajustado y guardado!";
        if (typeof guardarConfigEnNube === 'function') {
            guardarConfigEnNube(`unifreire_banner_${id}`, directUrl, msg);
            guardarConfigEnNube(`unifreire_banner_pos_${id}`, posStr, null);
            guardarConfigEnNube(`unifreire_banner_zoom_${id}`, zoomStr, null);
        }
    } else if (currentAdjustMode === 'career_portada') {
        const id = currentAdjustCareerId;
        // Guardar SOLO en portada (100% independiente de banner)
        localStorage.setItem(`unifreire_portada_${id}`, directUrl);
        localStorage.setItem(`unifreire_portada_pos_${id}`, posStr);
        localStorage.setItem(`unifreire_portada_zoom_${id}`, zoomStr);

        // Actualizar preview en panel
        const preview = document.getElementById(`preview-portada-${id}`);
        if (preview) {
            preview.style.backgroundImage = `url('${directUrl}')`;
            preview.style.backgroundPosition = posStr;
            preview.style.backgroundSize = zoomStr;
        }

        const msg = document.getElementById(`msg-portada-${id}`);
        if (msg) msg.innerText = "¡Foto de portada ajustada y guardada!";
        if (typeof guardarConfigEnNube === 'function') {
            guardarConfigEnNube(`unifreire_portada_${id}`, directUrl, msg);
            guardarConfigEnNube(`unifreire_portada_pos_${id}`, posStr, null);
            guardarConfigEnNube(`unifreire_portada_zoom_${id}`, zoomStr, null);
        }
    }

    closeImageAdjuster();
}

function saveImageSetup() {
    saveAdjustedImage();
}


function syncLivePreview() {
    const title = document.getElementById('ce-title').value;
    const desc = document.getElementById('ce-desc').value;
    document.getElementById('sim-title').innerText = title || 'Título Carrera';
    document.getElementById('sim-desc').innerText = desc || 'Descripción';
    
    document.getElementById('sim-req').innerHTML = quillReqSaltillo ? quillReqSaltillo.root.innerHTML : document.getElementById('ce-req-saltillo').innerHTML;
    document.getElementById('sim-mod').innerHTML = quillModSaltillo ? quillModSaltillo.root.innerHTML : document.getElementById('ce-mod-saltillo').innerHTML;
    document.getElementById('sim-cost').innerHTML = quillCostSaltillo ? quillCostSaltillo.root.innerHTML : document.getElementById('ce-cost-saltillo').innerHTML;
}


// Polling silencioso para notificaciones de leads
setInterval(async () => {
    try {
        const res = await fetch(GLOBAL_BACKEND_URL + "?action=obtenerLeads");
        const cloudText = await res.text();
        let cloudLeads = decryptPayload(cloudText);
        if (!cloudLeads) {
            try { cloudLeads = JSON.parse(cloudText); } catch(e) {}
        }
        if (cloudLeads && Array.isArray(cloudLeads)) {
            const validLeads = cloudLeads.filter(lead => {
                const isAnon = !lead.nombre || lead.nombre.trim() === "" || lead.nombre.toLowerCase().includes("anon");
                const hasPhone = lead.telefono && lead.telefono.trim() !== "";
                const hasCareer = lead.carrera && lead.carrera.trim() !== "";
                return !isAnon && hasPhone && hasCareer;
            });
            const savedCount = parseInt(sessionStorage.getItem('unifreire_last_lead_count') || '0');
            if(savedCount > 0 && validLeads.length > savedCount) {
                const badge = document.getElementById('notif-badge');
                if(badge) {
                    badge.style.display = 'flex';
                    badge.innerText = (validLeads.length - savedCount).toString();
                    
                    // Actualizar local sin recargar agresivamente para no interrumpir al usuario
                    allLeads = validLeads;
                    allLeads.sort((a,b) => {
                        const pd = (dStr) => {
                            if(!dStr) return 0;
                            if(dStr.includes('/')) {
                                const p = dStr.split('/');
                                if(p.length >= 4) return new Date(p[2], p[1]-1, p[0], p[3].split(':')[0], p[3].split(':')[1]).getTime();
                            }
                            return new Date(dStr).getTime();
                        };
                        return pd(b.fecha) - pd(a.fecha);
                    });
                    localStorage.setItem('unifreire_leads', JSON.stringify(allLeads));
                }
            }
        }
    } catch(e) {}
}, 45000); // Cada 45 segundos

document.addEventListener('DOMContentLoaded', () => {
    const bell = document.getElementById('notif-bell');
    if(bell) {
        bell.addEventListener('click', () => {
            const badge = document.getElementById('notif-badge');
            if(badge) badge.style.display = 'none';
            sessionStorage.setItem('unifreire_last_lead_count', allLeads.length.toString());
            renderLeadsPage(); // Force re-render just in case
        });
    }
});


// =========================================
// FOTO DE PORTADAS (TARJETAS HOME)
// =========================================
function renderPortadasAdmin() {
    const grid = document.getElementById('admin-portadas-grid');
    if (!grid || typeof CAREERS_DATA === 'undefined') return;

    let html = '';
    Object.values(CAREERS_DATA).forEach(c => {
        // 100% independiente de unifreire_banner_
        const saved = localStorage.getItem(`unifreire_portada_${c.id}`) || c.defaultPortada || c.defaultBanner || '';
        const savedPos = localStorage.getItem(`unifreire_portada_pos_${c.id}`) || 'center';
        const savedZoom = localStorage.getItem(`unifreire_portada_zoom_${c.id}`) || 'cover';
        const previewUrl = typeof getDirectUrl === 'function' ? getDirectUrl(saved) : saved;

        html += `
            <div class="card glass" style="padding: 1.2rem; border-radius: 16px; display: flex; flex-direction: column; background: rgba(0,0,0,0.5); border: 1px solid var(--glass-border);">
                <div style="font-size: 0.8rem; color: var(--unifreire-yellow); font-weight: 600; text-transform: uppercase; margin-bottom: 0.3rem;">${c.type}</div>
                <h4 style="margin: 0 0 1rem 0; font-size: 1.15rem; color: white;">${c.name}</h4>
                
                <!-- Vista previa de la portada (con posición y zoom guardados) -->
                <div id="preview-portada-${c.id}" style="width: 100%; height: 160px; border-radius: 12px; background: url('${previewUrl}') ${savedPos}/${savedZoom.includes('%') ? savedZoom : 'cover'} no-repeat; border: 1px solid rgba(255,255,255,0.15); margin-bottom: 1rem; position: relative; overflow: hidden;">
                    <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.7); padding: 3px 8px; border-radius: 6px; font-size: 0.7rem; color: #fff; backdrop-filter: blur(4px);">Vista previa portada</div>
                </div>

                <div style="margin-top: auto;">
                    <label style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 0.3rem;">Enlace Google Drive o URL:</label>
                    <input type="text" id="url-portada-${c.id}" placeholder="https://drive.google.com/..." value="${saved}" style="width: 100%; padding: 0.6rem; border-radius: 6px; border: 1px solid var(--glass-border); background: var(--bg-dark); color: white; font-size: 0.85rem; margin-bottom: 0.6rem; box-sizing: border-box;">
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn-primary" style="flex: 1; padding: 0.55rem; font-size: 0.82rem;" onclick="openCareerPortadaAdjuster('${c.id}')">Ajustar Encuadre</button>
                        <button class="btn-accent" style="flex: 1; padding: 0.55rem; font-size: 0.82rem;" onclick="saveCareerPortada('${c.id}')">Guardar</button>
                    </div>
                    <p id="msg-portada-${c.id}" style="color: var(--unifreire-yellow); font-size: 0.8rem; margin-top: 0.5rem; text-align: center; min-height: 1.2rem; margin-bottom: 0;"></p>
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;
}

function saveCareerPortada(id) {
    const input = document.getElementById(`url-portada-${id}`);
    const msg = document.getElementById(`msg-portada-${id}`);
    if (!input || !msg) return;

    const rawUrl = input.value.trim();
    if (!rawUrl) {
        msg.innerText = "Por favor ingresa un enlace.";
        return;
    }

    const directUrl = typeof getDirectUrl === 'function' ? getDirectUrl(rawUrl) : rawUrl;
    
    // Guardar ÚNICAMENTE en portada (100% independiente de banner)
    localStorage.setItem(`unifreire_portada_${id}`, directUrl);
    
    // Activar Cache Buster para reflejar cambios inmediatos en usuarios
    localStorage.setItem('unifreire_cache_version', Date.now().toString());

    // Actualizar vista previa en el panel
    const preview = document.getElementById(`preview-portada-${id}`);
    if (preview) {
        preview.style.backgroundImage = `url('${directUrl}')`;
    }

    // Guardar en la nube si está disponible
    if (typeof guardarConfigEnNube === 'function') {
        guardarConfigEnNube(`unifreire_portada_${id}`, directUrl, msg);
    }
    
    msg.innerText = "¡Fotografía actualizada y guardada!";
    setTimeout(() => { if (msg.innerText.includes("¡Fotografía")) msg.innerText = ""; }, 4000);
}
