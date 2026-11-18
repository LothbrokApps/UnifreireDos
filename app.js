
function getDirectUrl(url) {
    if (!url) return "";
    url = url.trim();
    if (url.includes('drive.usercontent.google.com/download')) return url;
    if (url.includes('drive.google.com')) {
        const regexD = /\/d\/([a-zA-Z0-9_-]+)/;
        const regexId = /[?&]id=([a-zA-Z0-9_-]+)/;
        let id = null;
        if (regexD.test(url)) id = url.match(regexD)[1];
        else if (regexId.test(url)) id = url.match(regexId)[1];
        if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1920-h1080`;
    }
    return url;
}

const DEFAULT_HERO_VIDEO = "https://res.cloudinary.com/a5agws1y/video/upload/v1793922327/SPOT_EDIFICIOS.mp4";

function applyHeroMedia(savedHero) {
    const heroImg = document.getElementById('main-hero-img');
    const heroVideo = document.getElementById('main-hero-video');
    if (!heroImg && !heroVideo) return;

    if (!savedHero) {
        if (heroVideo) {
            heroVideo.style.display = 'block';
            heroVideo.play().catch(() => {});
        }
        if (heroImg) heroImg.style.display = 'none';
        return;
    }

    let url = "";
    let position = "50% 50%";
    let scale = 1;

    try {
        const config = JSON.parse(savedHero);
        if (config && config.url) {
            url = config.url;
            position = config.position || "50% 50%";
            scale = config.scale || 1;
        } else {
            url = savedHero;
        }
    } catch(e) {
        url = savedHero;
    }

    const directUrl = getDirectUrl(url);
    const isVideo = directUrl.endsWith('.mp4') || directUrl.endsWith('.webm') || directUrl.includes('/video/upload/');

    if (isVideo) {
        if (heroVideo) {
            const source = heroVideo.querySelector('source');
            if (source && source.src !== directUrl) {
                source.src = directUrl;
                heroVideo.load();
            } else if (!source) {
                heroVideo.src = directUrl;
            }
            heroVideo.style.display = 'block';
            heroVideo.play().catch(() => {});
        }
        if (heroImg) heroImg.style.display = 'none';
    } else {
        if (heroImg) {
            const cv = localStorage.getItem('unifreire_cache_version') || '';
            const finalUrl = cv ? (directUrl + (directUrl.includes('?') ? '&' : '?') + 'v=' + cv) : directUrl;
            heroImg.src = finalUrl;
            heroImg.style.objectPosition = position;
            heroImg.style.transform = `scale(${scale})`;
            heroImg.style.display = 'block';
        }
        if (heroVideo) {
            heroVideo.pause();
            heroVideo.style.display = 'none';
        }
    }
}





// =========================================
// AES-256 ENCRYPTION PAYLOAD SECURE
// =========================================
const SECRET_KEY = "UNIFREIRE_SECURE_KEY_2026_!@#";
function encryptPayload(jsonData) {
    try {
        const jsonString = JSON.stringify(jsonData);
        // Cifrado AES-256 real
        return CryptoJS.AES.encrypt(jsonString, SECRET_KEY).toString();
    } catch(e) {
        console.error("Error encriptando payload:", e);
        return null;
    }
}
function decryptPayload(encryptedData) {
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
        return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch(e) {
        return null;
    }
}

// =========================================
// TELEMETRÍA Y ANALÍTICA EN TIEMPO REAL
// =========================================
function recordTelemetryEvent(type, data) {
    try {
        // Switch maestro: solo registrar cuando la telemetría esté activada
        if (localStorage.getItem('unifreire_telemetry_active') !== 'true') {
            return;
        }
        const raw = localStorage.getItem('unifreire_analytics_events');
        let events = [];
        if (raw) {
            events = JSON.parse(raw);
            if (!Array.isArray(events)) events = [];
        }
        const newEvent = {
            type: type,
            timestamp: Date.now(),
            ...(data || {})
        };
        events.push(newEvent);
        // Mantener hasta 500 eventos para optimizar memoria en iOS/Android
        if (events.length > 500) {
            events = events.slice(-500);
        }
        localStorage.setItem('unifreire_analytics_events', JSON.stringify(events));
    } catch(e) {}
}

// =========================================
// APLICACIÓN DINÁMICA DE PLANTILLAS Y LUCES AMBIENTALES
// =========================================
function applyStoredTheme() {
    try {
        const stored = localStorage.getItem('unifreire_theme_config');
        if (stored) {
            const cfg = JSON.parse(stored);
            const root = document.documentElement;
            if (cfg.orb1) root.style.setProperty('--ambient-orb-1', cfg.orb1);
            if (cfg.orb2) root.style.setProperty('--ambient-orb-2', cfg.orb2);
            if (cfg.bgDark) root.style.setProperty('--bg-dark', cfg.bgDark);
            if (cfg.opacity !== undefined) root.style.setProperty('--orb-opacity', (cfg.opacity / 100).toString());
            if (cfg.blur !== undefined) root.style.setProperty('--orb-blur', `${cfg.blur}px`);

            // Actualizar degradado ambiental en el fondo de la página
            const body = document.body;
            if (body && cfg.orb1 && cfg.orb2) {
                body.style.backgroundImage = `
                    radial-gradient(circle at 12% 18%, ${cfg.orb1} 0%, transparent 48%),
                    radial-gradient(circle at 88% 82%, ${cfg.orb2} 0%, transparent 48%)
                `;
            }
        }
    } catch(e) {}
}

// =========================================
// APLICACIÓN DINÁMICA DE TEXTOS WEB (MINI-CMS)
// =========================================
function applyStoredSiteTexts() {
    try {
        const stored = localStorage.getItem('unifreire_site_texts');
        if (!stored) return;
        const texts = JSON.parse(stored);

        // 1. Titular Principal del Hero
        const heroTitle = document.querySelector('.hero-content h1');
        if (heroTitle && texts.hero_title) {
            heroTitle.innerHTML = texts.hero_title;
        }

        // 2. Experiencia Jaguar
        const expSection = document.getElementById('experiencia-jaguar');
        if (expSection) {
            const expH2 = expSection.querySelector('h2');
            const expP = expSection.querySelector('p');
            if (expH2 && texts.exp_title) expH2.innerHTML = texts.exp_title;
            if (expP && texts.exp_desc) expP.innerHTML = texts.exp_desc;
        }

        // 3. Título de Planteles
        const plantelesH3 = document.querySelector('footer h3');
        if (plantelesH3 && texts.planteles_title) {
            plantelesH3.innerHTML = texts.planteles_title;
        }

        // 4. Footer Copy
        const footerP = document.querySelector('footer > p:last-child');
        if (footerP && texts.footer_copy) {
            footerP.innerHTML = texts.footer_copy;
        }

        // 5. Exit Intent Gadget texts
        const exitTitle = document.querySelector('.exit-intent-title');
        const exitMsg = document.querySelector('.exit-intent-msg');
        const exitWa = document.querySelector('.exit-intent-wa-btn');
        if (exitTitle && texts.exit_intent_title) exitTitle.innerHTML = texts.exit_intent_title;
        if (exitMsg && texts.exit_intent_msg) exitMsg.innerHTML = texts.exit_intent_msg;
        if (exitWa && texts.exit_intent_wa) {
            const waNumber = texts.exit_intent_wa.replace(/\D/g, '');
            exitWa.href = `https://wa.me/52${waNumber}?text=${encodeURIComponent('Hola, estaba visitando el sitio de Unifreire y me gustaría recibir orientación sobre las carreras y planes de estudio.')}`;
        }
    } catch(e) {}
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Contador de Visitas Global
    let localVisits = parseInt(localStorage.getItem('unifreire_visit_count') || '0');
    if (!sessionStorage.getItem('visited_this_session')) {
        localVisits++;
        localStorage.setItem('unifreire_visit_count', localVisits.toString());
        sessionStorage.setItem('visited_this_session', 'true');
        try { fetch(GLOBAL_BACKEND_URL + "?action=registrarVisita", { method: "POST", mode: "no-cors" }); } catch(e){}
    }

    // 2. Registrar Telemetría de Visita y Hora Pico
    recordTelemetryEvent('visit_hour', { hour: new Date().getHours() });

    // 3. Aplicar Estilos, Plantillas y Textos Dinámicos
    applyStoredTheme();
    applyStoredSiteTexts();
    cargarConfigDesdeNube();
    initExitIntent();
    initBroadcastSync();
    if (typeof UnifreireLocalDB !== 'undefined') UnifreireLocalDB.syncOfflineLeads();
    
    // 4. Hamburger Menu Logic
    const hamburger = document.getElementById('hamburger-menu');
    const navLinks = document.getElementById('nav-links');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
    
    // Dropdown mobile toggle
    const dropdownBtn = document.querySelector('.dropdown > a');
    const dropdownContent = document.querySelector('.dropdown-content');
    if (dropdownBtn && dropdownContent) {
        dropdownBtn.addEventListener('click', (e) => {
            e.preventDefault();
            dropdownContent.classList.toggle('show-mobile');
        });
    }
    
    // Dynamic Hero Loading
    const savedHero = localStorage.getItem('unifreire_hero_banner');
    applyHeroMedia(savedHero);

    // Clicks en WhatsApp Telemetría
    document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"]').forEach(el => {
        el.addEventListener('click', () => {
            recordTelemetryEvent('whatsapp_click', { url: el.href });
        });
    });

    // Tracking de Profundidad de Scroll (Retención / Embudo)
    let scrollThresholds = { 25: false, 50: false, 75: false, 100: false };
    window.addEventListener('scroll', () => {
        const totalScrollable = document.documentElement.scrollHeight - window.innerHeight;
        if (totalScrollable > 0) {
            const scrollPercent = Math.round((window.scrollY / totalScrollable) * 100);
            [25, 50, 75, 100].forEach(threshold => {
                if (scrollPercent >= threshold && !scrollThresholds[threshold]) {
                    scrollThresholds[threshold] = true;
                    recordTelemetryEvent('scroll_depth', { depth: threshold });
                }
            });
        }
    }, { passive: true });

    // Tracking de Interacción por Secciones
    const trackedSections = ['carreras', 'experiencia-jaguar', 'planteles-container'];
    if ('IntersectionObserver' in window) {
        const trackedObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    recordTelemetryEvent('section_view', { sectionId: entry.target.id });
                    trackedObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.25 });

        trackedSections.forEach(id => {
            const el = document.getElementById(id);
            if (el) trackedObserver.observe(el);
        });
    }

    const grid = document.getElementById('careers-grid');
    const filterBtns = document.querySelectorAll('.filter-btn');

    if (grid) {
        renderCareers('all');

        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update active state
                filterBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                // Filter
                const filter = e.target.getAttribute('data-filter');
                renderCareers(filter);
            });
        });
    }
});

function renderCareers(filter) {
    const grid = document.getElementById('careers-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    // Sort array from object
    const careersArray = Object.values(CAREERS_DATA);

    const filtered = filter === 'all' 
        ? careersArray 
        : careersArray.filter(c => c.type === filter);

    filtered.forEach(c => {
        const card = document.createElement('div');
        card.className = 'career-card-visual';
        
        // Obtener portada personalizada o defaultPortada / defaultBanner (independiente de unifreire_banner_)
        const fallbackCover = c.defaultPortada || c.defaultBanner || 'assets/images/hero_bg.webp';
        const savedCover = localStorage.getItem(`unifreire_portada_${c.id}`) || fallbackCover;
        const coverPos = localStorage.getItem(`unifreire_portada_pos_${c.id}`) || 'center';
        const coverZoom = localStorage.getItem(`unifreire_portada_zoom_${c.id}`) || 'cover';
        const directUrl = (typeof getDirectUrl === 'function') ? getDirectUrl(savedCover) : savedCover;
        const cv = localStorage.getItem('unifreire_cache_version') || '';
        const finalImgUrl = cv ? (directUrl + (directUrl.includes('?') ? '&' : '?') + 'v=' + cv) : directUrl;

        card.style.backgroundImage = `url('${finalImgUrl}')`;
        card.style.backgroundPosition = coverPos;
        card.style.backgroundSize = coverZoom.includes('%') ? coverZoom : 'cover';
        card.setAttribute('onclick', `viewCareer('${c.id}')`);

        // Pre-carga con fallback para evitar que la imagen se quede cortada a la mitad en móviles
        const imgPreloader = new Image();
        imgPreloader.src = finalImgUrl;
        imgPreloader.onerror = () => {
            card.style.backgroundImage = `url('${fallbackCover}')`;
        };

        const rvoeText = c.rvoe ? c.rvoe : 'Validez Oficial SEP';

        card.innerHTML = `
            <div class="career-card-overlay"></div>
            
            <!-- Contenido de la tarjeta -->
            <div class="career-card-content">
                <h3 style="font-size: 1.18rem; font-weight: 700; color: #ffffff; margin: 0 0 0.3rem 0; text-shadow: 0 2px 6px rgba(0,0,0,0.85); line-height: 1.25;">${c.name}</h3>
                <p style="font-size: 0.84rem; color: rgba(255,255,255,0.88); margin: 0 0 0.5rem 0; font-weight: 500;">${c.type} • ${c.duration}</p>
                
                <!-- Badge de RVOE Oficial (sin ★ 5.0) optimizado para móvil -->
                <div style="display: flex; align-items: center; margin-bottom: 0.85rem;">
                    <div class="rvoe-badge" data-rvoe="true" style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.25rem 0.65rem; border-radius: 20px; background: rgba(0, 0, 0, 0.65); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border: 1px solid rgba(255, 184, 28, 0.45); font-size: 0.72rem; color: #ffb81c; font-weight: 600; max-width: 100%; box-sizing: border-box; line-height: 1.25;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffb81c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                        <span class="rvoe-text" style="color: #ffb81c !important;">${rvoeText}</span>
                    </div>
                </div>

                <div class="career-card-btn">
                    <span style="color: white; font-weight: 600; font-size: 0.88rem; letter-spacing: 0.4px;">Conoce más</span>
                    <div class="career-card-btn-arrow">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#004d36" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function viewCareer(id) {
    recordTelemetryEvent('career_click', { careerId: id });
    localStorage.setItem("carreraSeleccionada", id);
    window.location.href = "career.html";
}

async function cargarConfigDesdeNube() {
    try {
        if (typeof GLOBAL_BACKEND_URL === 'undefined' || !GLOBAL_BACKEND_URL) return;
        const res = await fetch(GLOBAL_BACKEND_URL + "?action=obtenerConfig");
        const config = await res.json();
        if (!config) return;

        let needsCareersReRender = false;
        
        if (config.hero_banner) {
            localStorage.setItem('unifreire_hero_banner', typeof config.hero_banner === 'string' ? config.hero_banner : JSON.stringify(config.hero_banner));
            if (typeof applyHeroMedia === 'function') applyHeroMedia(config.hero_banner);
        }
        
        if (config.carrusel && config.carrusel.length > 0) {
            const finalCarrusel = config.carrusel.map(getDirectUrl);
            localStorage.setItem('unifreire_carousel_images', JSON.stringify(finalCarrusel));
            if (typeof renderCarousel === 'function') renderCarousel();
        }

        if (config.unifreire_carousel_mode) {
            localStorage.setItem('unifreire_carousel_mode', config.unifreire_carousel_mode);
            if (typeof renderCarousel === 'function') renderCarousel();
        }
        
        if (config.banners) {
            Object.keys(config.banners).forEach(id => {
                const finalBannerUrl = getDirectUrl(config.banners[id]);
                localStorage.setItem(`unifreire_banner_${id}`, finalBannerUrl);
                
                const header = document.querySelector('.career-header');
                const cId = localStorage.getItem('carreraSeleccionada');
                if (header && cId === id) {
                    header.style.backgroundImage = `url('${finalBannerUrl}')`;
                }
            });
        }

        // Portadas personalizadas sincronizadas desde la nube
        if (config.portadas) {
            Object.keys(config.portadas).forEach(id => {
                const finalPortadaUrl = getDirectUrl(config.portadas[id]);
                localStorage.setItem(`unifreire_portada_${id}`, finalPortadaUrl);
                needsCareersReRender = true;
            });
        }

        if (config.portadas_pos) {
            Object.keys(config.portadas_pos).forEach(id => {
                localStorage.setItem(`unifreire_portada_pos_${id}`, config.portadas_pos[id]);
                needsCareersReRender = true;
            });
        }

        if (config.portadas_zoom) {
            Object.keys(config.portadas_zoom).forEach(id => {
                localStorage.setItem(`unifreire_portada_zoom_${id}`, config.portadas_zoom[id]);
                needsCareersReRender = true;
            });
        }

        if (config.unifreire_site_texts) {
            const siteTexts = typeof config.unifreire_site_texts === 'string' ? config.unifreire_site_texts : JSON.stringify(config.unifreire_site_texts);
            localStorage.setItem('unifreire_site_texts', siteTexts);
            applyStoredSiteTexts();
        }

        if (config.unifreire_theme_config) {
            const themeCfg = typeof config.unifreire_theme_config === 'string' ? config.unifreire_theme_config : JSON.stringify(config.unifreire_theme_config);
            localStorage.setItem('unifreire_theme_config', themeCfg);
            applyStoredTheme();
        }

        if (needsCareersReRender && typeof renderCareers === 'function') {
            const activeFilter = document.querySelector('.filter-btn.active')?.getAttribute('data-filter') || 'all';
            renderCareers(activeFilter);
        }
    } catch(err) {
        console.error("Error sincronizando config desde la nube:", err);
    }
}

// =========================================
// 1. SCROLL-DRIVEN ANIMATIONS
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    // Add reveal class to cards if they don't have it
    const elementsToReveal = document.querySelectorAll('.card, .experience-card, .plantel-card, .vocational-card, .test-container, .form-container');
    elementsToReveal.forEach(el => {
        el.classList.add('reveal');
    });

    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.reveal').forEach(el => {
        observer.observe(el);
    });

    // =========================================
    // 4. SKELETON LOADERS PARA IMÁGENES
    // =========================================
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        // If image is already loaded, skip
        if (img.complete) return;
        
        img.classList.add('skeleton-bg');
        img.addEventListener('load', () => {
            img.classList.remove('skeleton-bg');
            if (img.id === 'main-hero-img') autoTuneAmbientLightsFromImage(img);
        });
        img.addEventListener('error', () => {
            img.classList.remove('skeleton-bg');
        });
    });
});

// =========================================
// EXIT-INTENT GADGET (CAPTACIÓN DE ABANDONO)
// =========================================
function initExitIntent() {
    let siteTexts = {};
    try {
        const stored = localStorage.getItem('unifreire_site_texts');
        if (stored) siteTexts = JSON.parse(stored);
    } catch(e) {}

    // Si el administrador lo desactivó explícitamente, no inicializar
    if (siteTexts.exit_intent_active === false) return;

    // Solo mostrar una vez por sesión para no resultar invasivo
    if (sessionStorage.getItem('unifreire_exit_shown')) return;

    // Inyectar modal si no existe
    let overlay = document.getElementById('exit-intent-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'exit-intent-overlay';
        overlay.className = 'exit-intent-overlay';

        const title = siteTexts.exit_intent_title || '🎓 ¿Aún no decides tu carrera?';
        const msg = siteTexts.exit_intent_msg || '¿Tienes dudas sobre el plan de estudios o inscripciones? Habla directamente con un asesor académico por WhatsApp y recibe orientación personalizada en 1 minuto.';
        const waNumber = (siteTexts.exit_intent_wa || '8123631099').replace(/\D/g, '');
        const waLink = `https://wa.me/52${waNumber}?text=${encodeURIComponent('Hola, estaba visitando el sitio de Unifreire y me gustaría recibir orientación sobre las carreras y planes de estudio.')}`;

        overlay.innerHTML = `
            <div class="exit-intent-card" role="dialog" aria-modal="true">
                <button type="button" class="exit-intent-close" id="exit-intent-close-btn" aria-label="Cerrar">&times;</button>
                <div class="exit-intent-badge">⚡ ORIENTACIÓN ACADÉMICA INMEDIATA</div>
                <h2 class="exit-intent-title">${title}</h2>
                <p class="exit-intent-msg">${msg}</p>
                <a href="${waLink}" target="_blank" class="exit-intent-wa-btn" id="exit-intent-wa-action">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                    Hablar con un Asesor por WhatsApp
                </a>
            </div>
        `;
        document.body.appendChild(overlay);

        const closeBtn = document.getElementById('exit-intent-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeExitIntent);
        }
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeExitIntent();
        });
        const waAction = document.getElementById('exit-intent-wa-action');
        if (waAction) {
            waAction.addEventListener('click', () => {
                recordTelemetryEvent('exit_intent_whatsapp_click', { url: waAction.href });
                closeExitIntent();
            });
        }
    }

    function showExitIntent() {
        if (sessionStorage.getItem('unifreire_exit_shown')) return;
        sessionStorage.setItem('unifreire_exit_shown', 'true');
        overlay.classList.add('active');
        recordTelemetryEvent('exit_intent_shown');
    }

    function closeExitIntent() {
        overlay.classList.remove('active');
    }

    // 1. Detección en Desktop (Salida del puntero hacia la barra de navegación)
    document.addEventListener('mouseleave', (e) => {
        if (e.clientY <= 10) {
            showExitIntent();
        }
    });

    // 2. Detección en Móvil (Scroll reverso rápido tras revisar contenido o inactividad)
    let lastScrollTop = 0;
    let maxScroll = 0;
    let mobileTimer = setTimeout(() => {
        if (window.innerWidth <= 768 && maxScroll > 400) {
            showExitIntent();
        }
    }, 45000);

    window.addEventListener('scroll', () => {
        const st = window.pageYOffset || document.documentElement.scrollTop;
        if (st > maxScroll) maxScroll = st;
        // Si el usuario bajó bastante y hace un scroll rápido hacia arriba
        if (st < lastScrollTop - 120 && maxScroll > 600 && window.innerWidth <= 768) {
            showExitIntent();
        }
        lastScrollTop = st <= 0 ? 0 : st;
    }, { passive: true });
}

// =========================================
// SINCRONIZACIÓN EN TIEMPO REAL MULTI-PESTAÑA / DISPOSITIVOS (BROADCASTCHANNEL)
// =========================================
function initBroadcastSync() {
    if (!('BroadcastChannel' in window)) return;
    try {
        const channel = new BroadcastChannel('unifreire_channel');
        channel.onmessage = (event) => {
            const data = event.data;
            if (!data || !data.type) return;

            if (data.type === 'THEME_UPDATED') {
                applyStoredTheme();
            } else if (data.type === 'TEXTS_UPDATED') {
                applyStoredSiteTexts();
            } else if (data.type === 'HERO_UPDATED') {
                const savedHero = localStorage.getItem('unifreire_hero_banner');
                applyHeroMedia(savedHero);
            } else if (data.type === 'CAROUSEL_UPDATED') {
                if (typeof window.renderCarousel === 'function') window.renderCarousel();
            }
        };
    } catch(e) {}
}

// =========================================
// ALMACÉN OFFLINE-FIRST (INDEXEDDB - DEXIE ARCHITECTURE)
// =========================================
const UnifreireLocalDB = {
    dbName: 'UnifreireOfflineStore',
    dbVersion: 1,
    db: null,

    async getDB() {
        if (this.db) return this.db;
        return new Promise((resolve) => {
            if (!('indexedDB' in window)) return resolve(null);
            const req = indexedDB.open(this.dbName, this.dbVersion);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('leads')) {
                    db.createObjectStore('leads', { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains('cache')) {
                    db.createObjectStore('cache', { keyPath: 'key' });
                }
            };
            req.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };
            req.onerror = () => resolve(null);
        });
    },

    async saveOfflineLead(leadData) {
        try {
            const db = await this.getDB();
            if (!db) {
                const leads = JSON.parse(localStorage.getItem('unifreire_offline_leads') || '[]');
                leads.push({ ...leadData, timestamp: Date.now() });
                localStorage.setItem('unifreire_offline_leads', JSON.stringify(leads));
                return;
            }
            const tx = db.transaction('leads', 'readwrite');
            tx.objectStore('leads').add({ ...leadData, timestamp: Date.now() });
        } catch(e) {}
    },

    async syncOfflineLeads() {
        if (!navigator.onLine) return;
        try {
            const db = await this.getDB();
            let pendingLeads = [];
            if (db) {
                pendingLeads = await new Promise((resolve) => {
                    const tx = db.transaction('leads', 'readonly');
                    const req = tx.objectStore('leads').getAll();
                    req.onsuccess = () => resolve(req.result || []);
                    req.onerror = () => resolve([]);
                });
            } else {
                pendingLeads = JSON.parse(localStorage.getItem('unifreire_offline_leads') || '[]');
            }

            if (pendingLeads && pendingLeads.length > 0) {
                for (const lead of pendingLeads) {
                    try {
                        const encrypted = encryptPayload(lead);
                        await fetch(GLOBAL_BACKEND_URL + "?action=registrarProspecto", {
                            method: "POST",
                            mode: "no-cors",
                            headers: { "Content-Type": "text/plain" },
                            body: encrypted
                        });
                    } catch(err) {}
                }
                if (db) {
                    const txClear = db.transaction('leads', 'readwrite');
                    txClear.objectStore('leads').clear();
                }
                localStorage.removeItem('unifreire_offline_leads');
            }
        } catch(e) {}
    }
};

window.addEventListener('online', () => {
    UnifreireLocalDB.syncOfflineLeads();
});

// =========================================
// RECONOCIMIENTO Y CALIBRACIÓN DE LUCES AMBIENTALES DINÁMICAS (COLORTHIEF CANVAS ENGINE)
// =========================================
function autoTuneAmbientLightsFromImage(imgElement) {
    if (!imgElement || !imgElement.complete || !imgElement.naturalWidth) return;
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 10;
        canvas.height = 10;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imgElement, 0, 0, 10, 10);
        const imgData = ctx.getImageData(0, 0, 10, 10).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < imgData.length; i += 4) {
            const brightness = (imgData[i] + imgData[i+1] + imgData[i+2]) / 3;
            if (brightness > 30 && brightness < 235) {
                r += imgData[i];
                g += imgData[i+1];
                b += imgData[i+2];
                count++;
            }
        }
        if (count > 0) {
            r = Math.round(r / count);
            g = Math.round(g / count);
            b = Math.round(b / count);
            const dynamicColor = `rgb(${r}, ${g}, ${b})`;
            const cfg = JSON.parse(localStorage.getItem('unifreire_theme_config') || '{}');
            if (cfg.autoPalette) {
                document.documentElement.style.setProperty('--ambient-orb-1', dynamicColor);
            }
        }
    } catch(e) {}
}
