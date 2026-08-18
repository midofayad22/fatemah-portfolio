
const translations = {
    ar: {
        dir: "rtl",
        langBtn: "English",
        "page-title": "فاطمة عز | هندسة الحاسب - جامعة طنطا",
        "hero-name": "فاطمة عز",
        "hero-subtitle": "طالبة بكلية هندسة الحاسب جامعة طنطا | مهندسة أنظمة ومهتمة بالأمن السيبراني والـ IoT",
        "stat-1-title": "التخصص", "stat-1-val": "هندسة حاسب",
        "stat-2-title": "الجامعة", "stat-2-val": "جامعة طنطا",
        "stat-3-title": "الاهتمام", "stat-3-val": "Cyber Security & IoT",
        "profile-status": "متاحة للمشاريع والابتكار التقني",
        "profile-title": "النبذة التعريفية والأكاديمية",
        "profile-bio": "طالبة بكلية هندسة الحاسب في جامعة طنطا. أمتلك شغفاً عميقاً بالتقاطع المذهل بين البرمجيات والعتاد المادي (Hardware & Software Integration)، وتطوير الأنظمة المدمجة وإنترنت الأشياء (IoT)، إضافة إلى حماية الشبكات والأنظمة عبر الأمن السيبراني (Cyber Security). أجمع بين الدقة الهندسية الصارمة وحل المشكلات وبين الحس الفني البصري والأدبي.",
        "poetry-heading": "شغف الفن والأدب الأصيل",
        "poetry-tag": "روائع العرب",
        "poet-1-name": "من شعر أبو الطيب المتنبي",
        "poet-1-verse": "\"إِذا غامَرتَ في شَرَفٍ مَرومِ ... فَلا تَقنَع بِما دونَ النُجومِ\"",
        "poet-1-note": "في الطموح وعل الهمم",
        "poet-2-name": "من شعر أبو فراس الحمداني",
        "poet-2-verse": "\"أراعي نجوم الليل واهٍ من الدجى ... وأسأل نفسي أين مني من أهوى\"",
        "poet-2-note": "في صدق المشاعر والوفاء",
        "poet-3-name": "من شعر عنترة بن شداد",
        "poet-3-verse": "\"فَإِن تَنكُري خَلقي فإِنّي سَريعٌ إِلَى إِجَابَةِ مَن دَعَاني\"",
        "poet-3-note": "في الفخر والشهامة العربية",
        "gallery-title": "المعرض المرئي والفني المتقدم",
        "gallery-desc": "اختر التصنيف لاستكشاف الأرشيف المرئي بدقة وسلاسة فائقة (اضغط مرتين للإغلاق)",
        "btn-adv": "تصوير إبداعي (45 صورة)",
        "btn-agr": "ما زرعته يدي (10 صور)",
        "btn-cul": "الثقافة والفن (13 صورة)",
        "footer-title": "التواصل والشبكات المهنية",
        "footer-copy": "© 2026 تم هندسة وتطوير هذا البورتفوليو الاحترافي لفاطمة عز بأعلى معايير الإبداع الرقمي."
    },
    en: {
        dir: "ltr",
        langBtn: "عربي",
        "page-title": "Fatima Ezz | Computer Engineering - Tanta University",
        "hero-name": "Fatima Ezz",
        "hero-subtitle": "Computer Engineering Student at Tanta University | Cyber Security & IoT Enthusiast",
        "stat-1-title": "Major", "stat-1-val": "Computer Eng.",
        "stat-2-title": "University", "stat-2-val": "Tanta University",
        "stat-3-title": "Focus", "stat-3-val": "Cyber Security & IoT",
        "profile-status": "Available for Tech Innovation",
        "profile-title": "Professional & Academic Bio",
        "profile-bio": "A dedicated student in Computer Engineering at Tanta University. Deeply passionate about hardware and software integration, IoT development, and Cyber Security. Combining rigorous engineering problem-solving with a deep aesthetic vision in art and authentic Arabic poetry.",
        "poetry-heading": "Passion of Art & Authentic Literature",
        "poetry-tag": "Arab Masterpieces",
        "poet-1-name": "Al-Mutanabbi",
        "poet-1-verse": "\"If you venture into a noble quest ... Do not settle for less than the stars.\"",
        "poet-1-note": "On ambition and high aspirations",
        "poet-2-name": "Abu Firas al-Hamdani",
        "poet-2-verse": "\"I watch the stars of the night in despair ... Asking myself where my beloved is.\"",
        "poet-2-note": "On sincere emotions and loyalty",
        "poet-3-name": "Antarah ibn Shaddad",
        "poet-3-verse": "\"If you deny my nature, I am swift ... To answer the one who calls upon me.\"",
        "poet-3-note": "On pride and Arab chivalry",
        "gallery-title": "Advanced Visual & Art Gallery",
        "gallery-desc": "Select a category to explore the visual archive with supreme accuracy (Click twice to close)",
        "btn-adv": "Creative Photography (45 Photos)",
        "btn-agr": "What My Hands Planted (10 Photos)",
        "btn-cul": "Culture & Art (13 Photos)",
        "footer-title": "Professional Connections & Networks",
        "footer-copy": "© 2026 This professional portfolio was engineered exclusively for Fatima Ezz with top digital standards."
    }
};

let currentLang = 'ar';

function toggleLanguage() {
    currentLang = currentLang === 'ar' ? 'en' : 'ar';
    const htmlRoot = document.getElementById('html-root');
    const langText = document.getElementById('lang-text');
    
    htmlRoot.setAttribute('lang', currentLang);
    htmlRoot.setAttribute('dir', translations[currentLang].dir);
    langText.textContent = translations[currentLang].langBtn;

    document.querySelectorAll('[data-translate]').forEach(el => {
        const key = el.getAttribute('data-translate');
        if (translations[currentLang][key]) {
            el.textContent = translations[currentLang][key];
        }
    });
}

// تأثير الماوس النظيف والممسوح (أزرق ووردي خفيف عند الحركة فقط)
const trailContainer = document.getElementById('cursor-trail-container');
let lastMoveTime = 0;

window.addEventListener('mousemove', (e) => {
    const now = Date.now();
    if (now - lastMoveTime > 50 && trailContainer) {
        lastMoveTime = now;
        const particle = document.createElement('div');
        particle.className = 'trail-particle';
        particle.style.left = `${e.clientX}px`;
        particle.style.top = `${e.clientY}px`;
        
        trailContainer.appendChild(particle);

        if (window.gsap) {
            gsap.to(particle, {
                scale: 1.8,
                opacity: 0,
                duration: 0.6,
                ease: "power1.out",
                onComplete: () => particle.remove()
            });
        } else {
            setTimeout(() => particle.remove(), 600);
        }
    }
});

// نظام المعرض الذكي مع إمكانية الإغلاق التام بضغطة أخرى
let activeCategory = null;

function toggleGallery(category, count, prefix, btnElement) {
    const container = document.getElementById('gallery-container');
    if (!container) return;

    if (activeCategory === category) {
        container.innerHTML = '';
        btnElement.classList.remove('active');
        activeCategory = null;
        return;
    }

    document.querySelectorAll('.gallery-btn').forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');
    activeCategory = category;
    container.innerHTML = '';

    for (let i = 1; i <= count; i++) {
        const img = document.createElement('img');
        img.src = `assets/${category}/${prefix}${i}.jpg`;
        img.alt = `${category} image ${i}`;
        img.className = 'gallery-img';
        
        img.onerror = function() {
            this.src = 'assets/profile.jpg'; 
        };

        container.appendChild(img);
    }

    if (window.gsap) {
        gsap.from('.gallery-img', {
            duration: 0.4,
            opacity: 0,
            scale: 0.9,
            y: 15,
            stagger: 0.02,
            ease: "power2.out"
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.gallery-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetBtn = e.currentTarget;
            const category = targetBtn.getAttribute('data-category');
            const count = parseInt(targetBtn.getAttribute('data-count'), 10);
            const prefix = targetBtn.getAttribute('data-prefix');
            
            toggleGallery(category, count, prefix, targetBtn);
        });
    });

    if (window.gsap) {
        gsap.from('.hero-section', { duration: 1, opacity: 0, y: -20, ease: "power3.out" });
        gsap.from('.card-3d', { duration: 1, opacity: 0, y: 20, stagger: 0.12, ease: "power3.out", delay: 0.15 });
    }
});