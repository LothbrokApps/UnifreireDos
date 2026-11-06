
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

document.addEventListener('DOMContentLoaded', () => {
    // 1. Contador de Visitas Global
    let localVisits = parseInt(localStorage.getItem('unifreire_visit_count') || '0');
    if (!sessionStorage.getItem('visited_this_session')) {
        localVisits++;
        localStorage.setItem('unifreire_visit_count', localVisits.toString());
        sessionStorage.setItem('visited_this_session', 'true');
        // Opcional: Enviar ping al servidor para conteo global
        try { fetch(GLOBAL_BACKEND_URL + "?action=registrarVisita", { method: "POST", mode: "no-cors" }); } catch(e){}
    }

    cargarConfigDesdeNube();
    
    // Hamburger Menu Logic
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
        
        // Obtener portada personalizada o defaultBanner o fallback
        const savedCover = localStorage.getItem(`unifreire_portada_${c.id}`) || localStorage.getItem(`unifreire_banner_${c.id}`) || c.defaultBanner || 'assets/images/hero_bg.webp';
        const directUrl = (typeof getDirectUrl === 'function') ? getDirectUrl(savedCover) : savedCover;
        const cv = localStorage.getItem('unifreire_cache_version') || '';
        const finalImgUrl = cv ? (directUrl + (directUrl.includes('?') ? '&' : '?') + 'v=' + cv) : directUrl;

        card.style.backgroundImage = `url('${finalImgUrl}')`;
        card.setAttribute('onclick', `viewCareer('${c.id}')`);

        const rvoeText = c.rvoe ? c.rvoe : 'Validez Oficial SEP';

        card.innerHTML = `
            <div class="career-card-overlay"></div>
            
            <!-- Contenido de la tarjeta -->
            <div class="career-card-content">
                <h3 style="font-size: 1.18rem; font-weight: 700; color: #ffffff; margin: 0 0 0.3rem 0; text-shadow: 0 2px 6px rgba(0,0,0,0.85); line-height: 1.25;">${c.name}</h3>
                <p style="font-size: 0.84rem; color: rgba(255,255,255,0.88); margin: 0 0 0.5rem 0; font-weight: 500;">${c.type} • ${c.duration}</p>
                
                <!-- Badge de RVOE Oficial (sin ★ 5.0) -->
                <div style="display: flex; align-items: center; margin-bottom: 0.85rem;">
                    <div style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.25rem 0.65rem; border-radius: 20px; background: rgba(0, 0, 0, 0.65); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border: 1px solid rgba(255, 184, 28, 0.45); font-size: 0.72rem; color: #ffb81c; font-weight: 600; max-width: 100%; box-sizing: border-box;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffb81c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${rvoeText}</span>
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
    localStorage.setItem("carreraSeleccionada", id);
    window.location.href = "career.html";
}

async function cargarConfigDesdeNube() {
    try {
        const res = await fetch(GLOBAL_BACKEND_URL + "?action=obtenerConfig");
        const config = await res.json();
        
        
        
        if (config.hero_banner) {
            localStorage.setItem('unifreire_hero_banner', typeof config.hero_banner === 'string' ? config.hero_banner : JSON.stringify(config.hero_banner));
            applyHeroMedia(config.hero_banner);
        }
        
        if (config.carrusel && config.carrusel.length > 0) {
            const finalCarrusel = config.carrusel.map(getDirectUrl);
            localStorage.setItem('unifreire_carousel_images', JSON.stringify(finalCarrusel));
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
        });
        img.addEventListener('error', () => {
            img.classList.remove('skeleton-bg');
        });
    });
});
