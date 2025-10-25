import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, query, orderBy, where, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

const firebaseConfig = {
    apiKey: "AIzaSyCX3V3ePcu6T5nb-yaHwrLuYhxgrSU-laY",
    authDomain: "akilli-balik-asistani.firebaseapp.com",
    projectId: "akilli-balik-asistani",
    storageBucket: "akilli-balik-asistani.firebasestorage.app",
    messagingSenderId: "684646155371",
    appId: "1:684646155371:web:ece96c35c10fcb652d5d2e",
    measurementId: "G-C7W8B6LP8P"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); 

const map = L.map('map').setView([39.0, 35.0], 6); // Türkiye'ye odaklı başlat
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);
let marker;
map.on('click', function(e) {
    const lat = e.latlng.lat;
    const lon = e.latlng.lng; 
    const konumBilgisiP = document.getElementById('konum-bilgisi');
    if (konumBilgisiP) {
        konumBilgisiP.textContent = `Konum seçildi: ${lat.toFixed(4)}, ${lon.toFixed(4)}. Tavsiyeler alınıyor...`;
    }
    if (marker) {
        marker.setLatLng(e.latlng); 
    } else {
        marker = L.marker(e.latlng).addTo(map); 
    }
    haritadanTavsiyeAl(lat, lon, aktifSuTipi);
}); 
let currentUser = null;
let aktifSuTipi = 'tuzlu_su';
let sonGelenVeri = null;
let seciliSonucIndex = -1;
let puanGaugesi = null;


const userStatusDiv = document.getElementById('user-status');
const authModal = document.getElementById('auth-modal');
const authKapatBtn = document.getElementById('auth-kapat-btn');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authErrorDiv = document.getElementById('auth-error');
const isimSoyisimInput = document.getElementById('isim-soyisim');
const balikAramaInput = document.getElementById('balik-arama');
const aramaSonuclariDiv = document.getElementById('arama-sonuclari');
const secilenBalikIdInput = document.getElementById('secilen-balik-id');
const detayGorBtn = document.getElementById('detay-gor-btn');
const sonucAlani = document.getElementById('sonuc-alani');
const yukleniyor = document.getElementById('yukleniyor');
const kayitModal = document.getElementById('kayit-modal');
const modalKapatBtn = document.getElementById('modal-kapat-btn');
const kaydiOnaylaBtn = document.getElementById('kaydi-onayla-btn');
const avNotlariInput = document.getElementById('av-notlari');
const avYontemiSelect = document.getElementById('av-yontemi');
const avFotografInput = document.getElementById('av-fotograf');
const defterModal = document.getElementById('defter-modal');
const defterKapatBtn = document.getElementById('defter-kapat-btn');
const kayitListesi = document.getElementById('kayit-listesi');
const ansiklopediModal = document.getElementById('ansiklopedi-modal');
const ansiklopediKapatBtn = document.getElementById('ansiklopedi-kapat-btn');
const ansiklopediBaslik = document.getElementById('ansiklopedi-baslik');
const ansiklopediIcerik = document.getElementById('ansiklopedi-icerik');
const authTitle = document.getElementById('auth-title');
const isimSoyisimAlani = document.getElementById('isim-soyisim-alanı');
const loginActions = document.getElementById('login-actions');
const signupActions = document.getElementById('signup-actions');
const switchToSignupBtn = document.getElementById('switch-to-signup');
const switchToLoginBtn = document.getElementById('switch-to-login');
const googleSigninBtn = document.getElementById('google-signin-btn');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');
const balikListesiBolumu = document.getElementById('balik-listesi-bolumu');
const balikListesiBaslik = document.getElementById('balik-listesi-baslik');
const balikListesiIcerik = document.getElementById('balik-listesi-icerik');
const aydinlatmaModal = document.getElementById('aydinlatma-modal');
const aydinlatmaKapatBtn = document.getElementById('aydinlatma-kapat-btn');
const aydinlatmaLinki = document.getElementById('aydinlatma-linki');
const accountModal = document.getElementById('account-modal');
const accountKapatBtn = document.getElementById('account-kapat-btn');
const accountNameInput = document.getElementById('account-name');
const saveNameBtn = document.getElementById('save-name-btn');
const currentPasswordInput = document.getElementById('current-password');
const newPasswordInput = document.getElementById('new-password');
const savePasswordBtn = document.getElementById('save-password-btn');
const accountErrorDiv = document.getElementById('account-error');
const kullanimModal = document.getElementById('kullanim-modal');
const kullanimKapatBtn = document.getElementById('kullanim-kapat-btn');
const kullanimLinki = document.getElementById('kullanim-linki');

document.addEventListener('DOMContentLoaded', setupAllEventListeners);

function setupAllEventListeners() {
    const footerTuzluSuBtn = document.getElementById('footer-tuzlu-su-btn');
    if (footerTuzluSuBtn) {
        footerTuzluSuBtn.addEventListener('click', e => { e.preventDefault(); showFishList('tuzlu_su'); });
    }

    const footerTatliSuBtn = document.getElementById('footer-tatli-su-btn');
    if (footerTatliSuBtn) {
        footerTatliSuBtn.addEventListener('click', e => { e.preventDefault(); showFishList('tatli_su'); });
    }

    const footerAydinlatmaLinki = document.getElementById('footer-aydinlatma-linki');
    if (footerAydinlatmaLinki) {
        footerAydinlatmaLinki.addEventListener('click', (e) => { e.preventDefault(); aydinlatmaModal.classList.remove('hidden'); });
    }

    const suTipiDenizBtn = document.getElementById('su-tipi-deniz');
    const suTipiTatliBtn = document.getElementById('su-tipi-tatli');

    if (suTipiDenizBtn && suTipiTatliBtn) {
        suTipiDenizBtn.addEventListener('click', () => {
            aktifSuTipi = 'tuzlu_su';
            suTipiDenizBtn.classList.add('bg-blue-600', 'text-white');
            suTipiDenizBtn.classList.remove('bg-white', 'text-gray-900');
            suTipiTatliBtn.classList.add('bg-white', 'text-gray-900');
            suTipiTatliBtn.classList.remove('bg-blue-600', 'text-white');
        });

        suTipiTatliBtn.addEventListener('click', () => {
            aktifSuTipi = 'tatli_su';
            suTipiTatliBtn.classList.add('bg-blue-600', 'text-white');
            suTipiTatliBtn.classList.remove('bg-white', 'text-gray-900');
            suTipiDenizBtn.classList.add('bg-white', 'text-gray-900');
            suTipiDenizBtn.classList.remove('bg-blue-600', 'text-white');
        });
    }
    saveNameBtn.addEventListener('click', handleNameUpdate);
    savePasswordBtn.addEventListener('click', handlePasswordUpdate);
}
    authKapatBtn.addEventListener('click', () => authModal.classList.add('hidden'));
    signupBtn.addEventListener('click', handleSignup);
    loginBtn.addEventListener('click', handleLogin);
    googleSigninBtn.addEventListener('click', handleGoogleSignin);
    forgotPasswordLink.addEventListener('click', handlePasswordReset);
    switchToSignupBtn.addEventListener('click', (e) => { e.preventDefault(); setModalState('signup'); });
    switchToLoginBtn.addEventListener('click', (e) => { e.preventDefault(); setModalState('login'); });

    // --- Balık Arama ---
    balikAramaInput.addEventListener('input', handleBalikAramaInput);
    balikAramaInput.addEventListener('keydown', handleBalikAramaKeydown);
    detayGorBtn.addEventListener('click', handleDetayGorme);

    // --- Av Kayıt Modalı ---
    modalKapatBtn.addEventListener('click', () => {
        kayitModal.classList.add('hidden');
        avNotlariInput.value = '';
        avFotografInput.value = null;
    });
    kaydiOnaylaBtn.addEventListener('click', handleKayitOnayla);

    // --- Diğer Modallar ---
    defterKapatBtn.addEventListener('click', () => defterModal.classList.add('hidden'));
    ansiklopediKapatBtn.addEventListener('click', () => ansiklopediModal.classList.add('hidden'));
    accountKapatBtn.addEventListener('click', () => accountModal.classList.add('hidden'));
    
    // --- Mobil Menü ---
    mobileMenuButton.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
    document.addEventListener('click', (event) => {
        if (!mobileMenu.classList.contains('hidden') && !mobileMenuButton.contains(event.target) && !mobileMenu.contains(event.target)) {
            mobileMenu.classList.add('hidden');
        }
    });

    aydinlatmaLinki.addEventListener('click', (e) => { e.preventDefault(); aydinlatmaModal.classList.remove('hidden'); });
    aydinlatmaKapatBtn.addEventListener('click', () => aydinlatmaModal.classList.add('hidden'));
    aydinlatmaModal.addEventListener('click', (e) => { if (e.target === aydinlatmaModal) aydinlatmaModal.classList.add('hidden'); });
    if (kullanimLinki && kullanimModal && kullanimKapatBtn) {
        kullanimLinki.addEventListener('click', (e) => { e.preventDefault(); kullanimModal.classList.remove('hidden'); });
        kullanimKapatBtn.addEventListener('click', () => kullanimModal.classList.add('hidden'));
        kullanimModal.addEventListener('click', (e) => { if (e.target === kullanimModal) kullanimModal.classList.add('hidden'); });
    }
    
onAuthStateChanged(auth, (user) => {
    buildMobileMenu(user);
    authModal.classList.add('hidden');

    if (user) {
        currentUser = user;
        const displayName = user.displayName || user.email.split('@')[0];
        userStatusDiv.innerHTML = `<span class="text-sm text-white/80 hidden md:block" title="${user.email}">${displayName}</span>`;
    } else {
        currentUser = null;
        userStatusDiv.innerHTML = `<button id="auth-ac-btn" class="px-4 py-2 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white font-semibold rounded-lg">Giriş Yap / Kaydol</button>`;
        document.getElementById('auth-ac-btn').addEventListener('click', () => {
            setModalState('login');
            authErrorDiv.classList.add('hidden');
            emailInput.value = '';
            passwordInput.value = '';
            authModal.classList.remove('hidden');
        });
    }
});

function haritadanTavsiyeAl(lat, lon, suTipi) {
    const hedefBalikId = secilenBalikIdInput.value;
    startLoading();

    fetchPublicCatches(lat, lon);
    if (hedefBalikId) {
        apiIstegiGonder(`/get_recommendation/${hedefBalikId}/${lat}/${lon}`, sonuclariDetayliGoster);
    } else {
        apiIstegiGonder(`/get_fish_by_coords/${lat}/${lon}/${suTipi}`, sonuclariKesfetOlarakGoster);
    }
}

async function apiIstegiGonder(apiUrl, sonucGostericiFonksiyon) {
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ hata: 'Sunucudan geçersiz yanıt.' }));
            throw new Error(errorData.hata || 'API yanıtı başarısız.');
        }
        const data = await response.json();
        sonGelenVeri = data;
        sonucGostericiFonksiyon(data);
    } catch (error) {
        sonucAlani.innerHTML = `<div class="bg-red-100 border-red-400 text-red-700 px-4 py-3 rounded-lg"><strong>Hata:</strong> ${error.message}</div>`;
        sonucAlani.classList.remove('hidden');
    } finally {
        stopLoading();
    }
}

function handleLogin() {
    signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value).catch(handleAuthError);
}

function handleSignup() {
    const isimSoyisim = isimSoyisimInput.value.trim();
    if (!isimSoyisim) {
        handleAuthError({ code: 'auth/missing-display-name' });
        return;
    }
    createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
        .then(userCredential => updateProfile(userCredential.user, { displayName: isimSoyisim }))
        .catch(handleAuthError);
}

function handleGoogleSignin() {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .then(() => authModal.classList.add('hidden'))
        .catch(error => { if (error.code !== 'auth/popup-closed-by-user') handleAuthError(error); });
}

function handlePasswordReset(e) {
    e.preventDefault();
    if (!emailInput.value) {
        alert("Lütfen şifresini sıfırlamak istediğiniz e-posta adresini, e-posta alanına yazın.");
        return;
    }
    sendPasswordResetEmail(auth, emailInput.value)
        .then(() => {
            alert("Şifre sıfırlama e-postası gönderildi. Lütfen e-posta kutunuzu kontrol edin.");
            authModal.classList.add('hidden');
        })
        .catch(handleAuthError);
}


async function handleKayitOnayla() {
    if (!currentUser || !sonGelenVeri) return;

    kaydiOnaylaBtn.disabled = true;
    kaydiOnaylaBtn.textContent = 'Başlatılıyor...';

    const isPublic = document.getElementById('av-paylas').checked;
    const konum = sonGelenVeri.istek_yapilan_konum;

    if (isPublic && (!konum || !konum.enlem || !konum.boylam)) {
        alert("Herkese açık paylaşım için haritadan bir konum seçilmiş olmalıdır.");
        kaydiOnaylaBtn.disabled = false;
        kaydiOnaylaBtn.textContent = 'Kaydı Onayla';
        return;
    }

    try {
        const file = avFotografInput.files[0];
        let fotoURL = null;

        if (file) {
            kaydiOnaylaBtn.textContent = 'Fotoğraf Yükleniyor...';
            const storageRef = ref(storage, `users/${currentUser.uid}/kayitlar/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            fotoURL = await getDownloadURL(snapshot.ref);
        }

        kaydiOnaylaBtn.textContent = 'Veri Kaydediliyor...';
        const hedefBalikAdi = sonGelenVeri.balik_tavsiyesi?.hedef_balik || sonGelenVeri.hedef_balik?.isim || 'Bilinmeyen Balık';
        const tavsiyePuani = sonGelenVeri.balik_tavsiyesi?.akilli_tavsiye?.puan || sonGelenVeri.anlik_puan || 0;

        const ozelKayitVerisi = {
            tarih: new Date().toISOString(),
            yontem: avYontemiSelect.value,
            notlar: avNotlariInput.value.trim(),
            balik_adi: hedefBalikAdi,
            konum: konum, 
            hava_durumu: sonGelenVeri.mevcut_hava_durumu,
            ay_evresi: sonGelenVeri.ay_evresi,
            gun_zamani: sonGelenVeri.gun_zamani,
            tavsiye_puanı: tavsiyePuani,
            foto_url: fotoURL
        };

        await addDoc(collection(db, `users/${currentUser.uid}/kayitlar`), ozelKayitVerisi);
        
        if (isPublic) {
            kaydiOnaylaBtn.textContent = 'Herkese Açık Paylaşılıyor...';
            
            const publicKayitVerisi = {
                tarih: new Date().toISOString(),
                yontem: avYontemiSelect.value,
                notlar: avNotlariInput.value.trim(),
                balik_adi: hedefBalikAdi,
                konum: konum, 
                foto_url: fotoURL,
                tavsiye_puanı: tavsiyePuani,
                userId: currentUser.uid,
                userName: currentUser.displayName || currentUser.email.split('@')[0]
            };
            
            await addDoc(collection(db, "public_catches"), publicKayitVerisi);
        }

        alert('Av kaydınız başarıyla eklendi!');
        modalKapatBtn.click(); // Modalı kapat

    } catch (error) {
        alert(`Kayıt sırasında bir hata oluştu: ${error.message}`);
        console.error("Kayıt hatası:", error);
    } finally {
        kaydiOnaylaBtn.disabled = false;
        kaydiOnaylaBtn.textContent = 'Kaydı Onayla';
        document.getElementById('av-paylas').checked = false; // Kutuyu sıfırla
    }
}

function handleNameUpdate() {
    const newName = accountNameInput.value.trim();
    if (!newName) {
        accountErrorDiv.textContent = "İsim alanı boş bırakılamaz.";
        accountErrorDiv.classList.remove('hidden');
        return;
    }
    updateProfile(auth.currentUser, { displayName: newName })
        .then(() => {
            alert("İsminiz başarıyla güncellendi!");
            accountModal.classList.add('hidden');
            onAuthStateChanged(auth, auth.currentUser); 
        })
        .catch((error) => {
            accountErrorDiv.textContent = `Bir hata oluştu: ${error.message}`;
            accountErrorDiv.classList.remove('hidden');
        });
}

function handlePasswordUpdate() {
    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;

    if (!currentPassword || !newPassword) {
        accountErrorDiv.textContent = "Lütfen tüm şifre alanlarını doldurun.";
        accountErrorDiv.classList.remove('hidden');
        return;
    }
    const user = auth.currentUser;
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    reauthenticateWithCredential(user, credential).then(() => {
        return updatePassword(user, newPassword);
    }).then(() => {
        alert("Şifreniz başarıyla değiştirildi!");
        accountModal.classList.add('hidden');
    }).catch((error) => {
        let message = (error.code === 'auth/wrong-password') ? "Mevcut şifreniz hatalı. Lütfen kontrol edin." : "Bir hata oluştu. Lütfen tekrar deneyin.";
        accountErrorDiv.textContent = message;
        accountErrorDiv.classList.remove('hidden');
    });
}


// --- ARAYÜZ (UI) FONKSİYONLARI ---

function startLoading() {
    sonucAlani.innerHTML = '';
    sonucAlani.classList.add('hidden');
    yukleniyor.classList.remove('hidden');
}

function stopLoading() {
    yukleniyor.classList.add('hidden');
}

function setModalState(state) {
    authTitle.textContent = state === 'login' ? 'Giriş Yap' : 'Kaydol';
    isimSoyisimAlani.classList.toggle('hidden', state === 'login');
    loginActions.classList.toggle('hidden', state !== 'login');
    signupActions.classList.toggle('hidden', state !== 'signup');
}

function handleAuthError(error) {
    const errorMessages = {
        'auth/missing-display-name': "Lütfen isim soyisim alanını doldurun.",
        'auth/invalid-credential': "E-posta veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.",
        'auth/email-already-in-use': "Bu e-posta adresi zaten kayıtlı.",
        'auth/weak-password': "Şifreniz çok zayıf. Lütfen en az 6 karakter kullanın.",
        'auth/invalid-email': "Lütfen geçerli bir e-posta adresi girin.",
        'auth/network-request-failed': "İnternet bağlantısı kurulamadı. Lütfen bağlantınızı kontrol edin."
    };
    authErrorDiv.textContent = errorMessages[error.code] || "Bir hata oluştu. Lütfen tekrar deneyin.";
    authErrorDiv.classList.remove('hidden');
    console.error("Firebase Hatası Kodu:", error.code);
}

function buildMobileMenu(user) {
    
    const commonLinksHTML = `
        <a href="#asistan" data-menu-link="asistan" class="block py-3 px-6 text-gray-700 hover:bg-gray-100 font-semibold border-t">Asistan (Harita)</a>
        <a href="#" id="show-saltwater-btn" class="block py-3 px-6 text-gray-700 hover:bg-gray-100 font-semibold border-t">Tuzlu Su Balıkları</a>
        <a href="#" id="show-freshwater-btn" class="block py-3 px-6 text-gray-700 hover:bg-gray-100 font-semibold">Tatlı Su Balıkları</a>
        <a href="#misyon" data-menu-link="misyon" class="block py-3 px-6 text-gray-700 hover:bg-gray-100 font-semibold border-t">Hakkımızda</a>
        <a href="#sss" data-menu-link="sss" class="block py-3 px-6 text-gray-700 hover:bg-gray-100 font-semibold">Sıkça Sorulan Sorular</a>
        <a href="#iletisim-formu" data-menu-link="iletisim" class="block py-3 px-6 text-gray-700 hover:bg-gray-100 font-semibold border-t">Destek & İletişim</a>
    `;

    let menuHTML = '';
    if (user) {
        menuHTML = `
            <a href="#" id="menu-defter" class="block py-3 px-6 text-gray-700 hover:bg-gray-100 font-bold text-blue-700">Av Kayıt Defterim</a>
            <a href="#" id="menu-hesabim" class="block py-3 px-6 text-gray-700 hover:bg-gray-100 font-semibold border-b">Hesabım</a>
            ${commonLinksHTML}
            <div class="py-2 px-6 border-t"><button id="menu-cikis" class="w-full text-left py-2 text-sm text-red-600 hover:text-red-800">Oturumu Kapat</button></div>`;
    
    } else {
        menuHTML = commonLinksHTML;
    }

    mobileMenu.innerHTML = menuHTML;

    if (user) {
        document.getElementById('menu-defter').addEventListener('click', e => { e.preventDefault(); defteriAc(); mobileMenu.classList.add('hidden'); });
        document.getElementById('menu-hesabim').addEventListener('click', e => { e.preventDefault(); openAccountModal(user); mobileMenu.classList.add('hidden'); });
        document.getElementById('menu-cikis').addEventListener('click', () => signOut(auth));
    }

    document.getElementById('show-saltwater-btn').addEventListener('click', e => { e.preventDefault(); showFishList('tuzlu_su'); });
    document.getElementById('show-freshwater-btn').addEventListener('click', e => { e.preventDefault(); showFishList('tatli_su'); });

    document.querySelectorAll('[data-menu-link]').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
        });
    });
}


const tumBalikListesi = window.BALIK_LISTESI_VERISI;

function handleBalikAramaInput() {
    const aramaTerimi = balikAramaInput.value.toLowerCase();
    aramaSonuclariDiv.innerHTML = '';
    seciliSonucIndex = -1;
    detayGorBtn.disabled = true;
    secilenBalikIdInput.value = '';
    if (aramaTerimi.length === 0) {
        aramaSonuclariDiv.classList.add('hidden');
        return;
    }
    const sonuclar = tumBalikListesi.filter(balik => balik.isim.toLowerCase().includes(aramaTerimi));
    if (sonuclar.length > 0) {
        sonuclar.forEach(balik => {
            const el = document.createElement('div');
            el.textContent = balik.isim;
            el.className = 'p-2 hover:bg-gray-100 cursor-pointer';
            el.addEventListener('click', () => balikSecildi(balik));
            aramaSonuclariDiv.appendChild(el);
        });
        aramaSonuclariDiv.classList.remove('hidden');
    } else {
        aramaSonuclariDiv.classList.add('hidden');
    }
}

function balikSecildi(balik) {
    balikAramaInput.value = balik.isim;
    secilenBalikIdInput.value = balik.id;
    aramaSonuclariDiv.classList.add('hidden');
    detayGorBtn.disabled = false;
}

function handleBalikAramaKeydown(e) {
    const sonuclar = aramaSonuclariDiv.children;
    if (sonuclar.length === 0) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        seciliSonucIndex = (e.key === 'ArrowDown') ? (seciliSonucIndex + 1) % sonuclar.length : (seciliSonucIndex - 1 + sonuclar.length) % sonuclar.length;
        guncelleSecili();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (seciliSonucIndex > -1) sonuclar[seciliSonucIndex].click();
        else sonuclar[0].click();
    } else if (e.key === 'Escape') {
        aramaSonuclariDiv.classList.add('hidden');
    }
}

function guncelleSecili() {
    Array.from(aramaSonuclariDiv.children).forEach((el, i) => {
        el.classList.toggle('secili-sonuc', i === seciliSonucIndex);
        if (i === seciliSonucIndex) el.scrollIntoView({ block: 'nearest' });
    });
}

async function handleDetayGorme() {
    const balikId = secilenBalikIdInput.value;
    if (!balikId) return;
    ansiklopediModal.classList.remove('hidden');
    ansiklopediIcerik.innerHTML = '<p>Yükleniyor...</p>';
    try {
        const response = await fetch(`/get_fish_details/${balikId}`);
        if (!response.ok) throw new Error('Balık detayı alınamadı.');
        const data = await response.json();
        ansiklopediBaslik.textContent = data.isim;

        let uyariHTML = '';
        if (data.yasal_uyari) {
            uyariHTML = `<div class="bg-red-100 border-l-4 border-red-500 text-red-800 p-3 rounded-lg mb-4 text-sm"><strong>YASAL UYARI:</strong> ${data.yasal_uyari}</div>`;
        }

        const gorselHTML = data.gorsel_url
            ? `<img src="/static/images/${data.gorsel_url}" alt="${data.isim}" class="w-full h-48 object-contain bg-gray-100 rounded-lg mb-4">`
            : '';

        const yemlerHTML = (data.yemler && data.yemler.length > 0)
            ? data.yemler.map(yem => `<span class="bg-blue-100 text-blue-800 text-xs font-medium inline-block me-2 mb-2 px-2.5 py-0.5 rounded-full">${yem}</span>`).join('')
            : '<span class="text-gray-500">N/A</span>';

        const tekniklerHTML = (data.onerilen_teknikler && data.onerilen_teknikler.length > 0)
            ? data.onerilen_teknikler.map(teknik => `<span class="bg-green-100 text-green-800 text-xs font-medium inline-block me-2 mb-2 px-2.5 py-0.5 rounded-full">${teknik}</span>`).join('')
            : '<span class="text-gray-500">N/A</span>';

        ansiklopediIcerik.innerHTML = `
            ${uyariHTML}
            ${gorselHTML}
            <div class="space-y-3 text-gray-700">
                <p><strong>Bilimsel Adı:</strong> <em class="text-gray-600">${data.bilimsel_isim || 'N/A'}</em></p>
                <p><strong>Su Tipi:</strong> ${data.tip === 'tuzlu_su' ? 'Tuzlu Su' : 'Tatlı Su'}</p>
                <p><strong>Minimum Av Boyu:</strong> ${data.min_boy_cm ? data.min_boy_cm + ' cm' : 'Belirtilmemiş'}</p>
                <p><strong>Yaşam Alanı:</strong> ${data.yasam_alani || 'N/A'}</p>
                <div>
                    <strong class="block mb-2">Popüler Yemler:</strong>
                    <div class="flex flex-wrap">${yemlerHTML}</div>
                </div>
            </div>`;
    } catch (error) {
        ansiklopediIcerik.innerHTML = `<p class="text-red-500">Detaylar yüklenemedi: ${error.message}</p>`;
    }
}

function sonuclariKesfetOlarakGoster(data) {
    sonucAlani.classList.remove('hidden');
    if (!data.onerilen_baliklar || data.onerilen_baliklar.length === 0) {
        sonucAlani.innerHTML = `<div class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-lg"><p class="font-bold">Balık Bulunamadı!</p><p>${data.sehir} bölgesinde bu mevsimde avlanabilecek uygun bir balık bulunamadı.</p></div>`;
        return;
    }

    let gelgitHTML = '';
    if (data.gelgit_verisi && data.gelgit_verisi.durum !== 'bilinmiyor') {
        gelgitHTML = ` | Gelgit: ${data.gelgit_verisi.durum_aciklamasi}`;
    }
    const balikKartlariHTML = data.onerilen_baliklar.map(balik => {
        const puanRengi = balik.anlik_puan >= 8 ? 'bg-green-500' : balik.anlik_puan >= 5 ? 'bg-yellow-500' : 'bg-red-500';
        
        const gorselHTML = balik.gorsel_url
            ? `<img src="/static/images/${balik.gorsel_url}" alt="${balik.isim}" class="w-20 h-20 object-contain bg-gray-100 rounded-md flex-shrink-0">`
            : `<div class="w-20 h-20 bg-gray-200 rounded-md flex-shrink-0"></div>`; 

        return `
            <div class="bg-white p-4 rounded-lg shadow-md border hover:shadow-lg transition-shadow flex items-center gap-4">
                ${gorselHTML}
                <div class="flex-grow">
                    <div class="flex justify-between items-start">
                        <h3 class="text-lg font-semibold text-blue-800">${balik.isim}</h3>
                        <div class="w-10 h-10 ${puanRengi} rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0">${balik.anlik_puan}</div>
                    </div>
                    <p class="text-xs text-gray-500 italic mb-2">${balik.bilimsel_isim || ''}</p>
                    <p class="text-sm text-gray-600">${balik.anlik_ipucu}</p>
                </div>
            </div>`;
    }).join('');
    const genelDurumHTML = `
        <div class="text-center mb-6">
            <h3 class="text-2xl font-bold text-gray-800">${data.sehir} İçin Balık Önerileri</h3>
            <p class="text-gray-500 text-sm mt-1">Hava: ${data.mevcut_hava_durumu.sicaklik_C.toFixed(1)}°C, ${data.mevcut_hava_durumu.aciklama} | ${data.ay_evresi.emoji} ${data.ay_evresi.isim}</p>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">${balikKartlariHTML}</div>`;
    sonucAlani.innerHTML = genelDurumHTML;
}

function sonuclariDetayliGoster(data) {
    sonucAlani.classList.remove('hidden');
    if (data.hata) { 
        sonucAlani.innerHTML = `<div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg"><p class="font-bold">${data.hata}</p></div>`;
        return;
    }

    let uyariHTML = '';
    if (data.yasal_uyari) {
        uyariHTML += `<div class="bg-red-100 border-l-4 border-red-500 text-red-800 p-4 rounded-lg mb-6 shadow"><p>${data.yasal_uyari.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p></div>`;
    }
    if (data.ureme_uyarisi) {
        uyariHTML += `<div class="bg-orange-100 border-l-4 border-orange-500 text-orange-800 p-4 rounded-lg mb-6 shadow"><p>${data.ureme_uyarisi.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p></div>`;
    }

    let gelgitHTML = '';
    if (data.gelgit_verisi && data.gelgit_verisi.durum !== 'bilinmiyor') {
        gelgitHTML = `
            <div classm="text-sm text-gray-500 text-center -mt-2 mb-2">
                Gelgit Durumu: <strong class="text-gray-700">${data.gelgit_verisi.durum_aciklamasi}</strong>
            </div>`;
    }

    const anlikPuan = data.balik_tavsiyesi.akilli_tavsiye.puan;
    const cizelgeHTML = data.tahmin_cizelgesi.map(item => {
        const barRengi = item.puan >= 8 ? 'bg-green-500' : item.puan >= 5 ? 'bg-yellow-500' : 'bg-red-500';
        return `
            <div class="flex flex-col items-center space-y-1 flex-1">
                <div class="text-sm font-bold text-gray-700">${item.puan}</div>
                <div class="chart-bar w-full h-40 bg-gray-200 rounded-md flex items-end" data-ipucu="${item.ipucu}" data-sicaklik="${item.sicaklik}" data-saat="${item.saat}">
                    <div class="w-full rounded-md ${barRengi}" style="height: ${item.puan * 10}%;"></div>
                </div>
                <img src="http://openweathermap.org/img/wn/${item.ikon}.png" alt="hava durumu" class="w-8 h-8"/>
                <div class="text-xs text-gray-500">${item.saat}</div>
            </div>`;
    }).join('');

    const yemlerHTML = (data.balik_tavsiyesi.onerilen_yemler && data.balik_tavsiyesi.onerilen_yemler.length > 0)
        ? data.balik_tavsiyesi.onerilen_yemler.map(yem => `<span class="bg-blue-100 text-blue-800 text-xs font-medium inline-block me-2 mb-2 px-2.5 py-0.5 rounded-full">${yem}</span>`).join('')
        : '<span class="text-gray-500">N/A</span>';

    
    const tekniklerHTML = (data.balik_tavsiyesi.onerilen_teknikler && data.balik_tavsiyesi.onerilen_teknikler.length > 0)
        ? data.balik_tavsiyesi.onerilen_teknikler.map(teknik => `<span class="bg-green-100 text-green-800 text-xs font-medium inline-block me-2 mb-2 px-2.5 py-0.5 rounded-full">${teknik}</span>`).join('')
        : '<span class="text-gray-500">N/A</span>';

    const anlikDurumHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-bold text-lg text-gray-800">${data.balik_tavsiyesi.hedef_balik} İçin Anlık Durum</h3>
                    ${currentUser ? `<button id="avi-kaydet-btn" class="bg-green-100 text-green-800 text-xs font-bold py-2 px-3 rounded-lg hover:bg-green-200 transition">Avını Kaydet 🎣</button>` : ''}
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div class="sm:col-span-1 flex flex-col items-center justify-center bg-gray-50 p-4 rounded-lg text-center space-y-1">
                        <div class="text-sm text-gray-500">Şu Anki Puan</div>
                        <div class="relative w-32 h-20 my-2">
                            <canvas id="puanGostergesi"></canvas>
                            <div id="puanMetni" class="absolute inset-0 flex items-center justify-center text-4xl font-extrabold text-gray-700 -mt-3"></div>
                        </div>
                        <div class="font-semibold text-gray-800">${data.istek_yapilan_konum.tespit_edilen_sehir}</div>
                    </div>
                    <div class="sm:col-span-2 space-y-3">
                        <p class="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg"><strong class="text-blue-700">Akıllı İpucu:</strong> ${data.balik_tavsiyesi.akilli_tavsiye.ipucu}</p>
                        <p class="text-sm text-gray-700"><strong>Önerilen Yemler:</strong> ${data.balik_tavsiyesi.onerilen_yemler.join(', ')}</p>
                    </div>
                </div>
            </div>
            <div class="border-t lg:border-t-0 lg:border-l lg:pl-6 pt-6 lg:pt-0">
                <h3 class="font-bold text-lg text-gray-800 mb-4">Gelecek Saatlik Tahmin</h3>
                <div class="flex items-end justify-between space-x-2 md:space-x-3">${cizelgeHTML}</div>
                <div id="tahmin-detay" class="mt-4 text-sm text-center bg-gray-50 p-3 rounded-lg min-h-[60px]">Detayları görmek için bir saat dilimine tıklayın.</div>
            </div>
        </div>`;
    sonucAlani.innerHTML = `${uyariHTML}${anlikDurumHTML}`;
    
    if (puanGaugesi) {
        puanGaugesi.destroy(); 
    }
    const ctx = document.getElementById('puanGostergesi');
    if (ctx) {
        document.getElementById('puanMetni').textContent = anlikPuan;
        let gaugeColor = '#ef4444'; // Düşük Puan: Kırmızı
        if (anlikPuan >= 8) gaugeColor = '#22c55e'; // Yüksek Puan: Yeşil
        else if (anlikPuan >= 5) gaugeColor = '#eab308'; // Orta Puan: Sarı

        puanGaugesi = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [anlikPuan, 10 - anlikPuan],
                    backgroundColor: [gaugeColor, '#e5e7eb'],
                    borderColor: ['#f8fafc', '#f8fafc'], 
                    borderWidth: 2,
                    circumference: 180, 
                    rotation: 270,     
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });
    }

    attachBarClickListeners();
    if (currentUser) {
        document.getElementById('avi-kaydet-btn').addEventListener('click', () => { kayitModal.classList.remove('hidden'); });
    }
}

function attachBarClickListeners() {
    const detayPaneli = document.getElementById('tahmin-detay');
    document.querySelectorAll('.chart-bar').forEach(bar => {
        bar.addEventListener('click', () => {
            document.querySelectorAll('.chart-bar').forEach(b => b.classList.remove('selected-bar'));
            bar.classList.add('selected-bar');
            detayPaneli.innerHTML = `<strong class="text-gray-800">${bar.dataset.saat} için İpucu:</strong> ${bar.dataset.ipucu || 'Özel bir ipucu yok.'} (Sıcaklık: ${bar.dataset.sicaklik}°C)`;
        });
    });
}

async function defteriAc() {
    if (!currentUser) return;
    defterModal.classList.remove('hidden');
    kayitListesi.innerHTML = '<p class="text-center text-gray-500">Kayıtlar yükleniyor...</p>';
    
    try {
        const q = query(collection(db, `users/${currentUser.uid}/kayitlar`), orderBy("tarih", "desc"));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            kayitListesi.innerHTML = '<p class="text-center text-gray-500">Henüz kayıtlı avınız bulunmuyor.</p>';
            return;
        }

        kayitListesi.innerHTML = querySnapshot.docs.map(doc => {
            const k = doc.data();
            const konumBilgisi = k.konum?.tespit_edilen_sehir || 'Konum Yok';
            
            const fotoHTML = k.foto_url
                ? `<img src="${k.foto_url}" alt="${k.balik_adi} fotoğrafı" class="w-full h-48 object-cover rounded-lg mt-3 mb-2">`
                : '';

            const haritaHTML = k.konum?.enlem
                ? `<div id="map-${doc.id}" class="w-full h-32 rounded-lg mt-3 bg-gray-200"></div>`
                : '';

            const iconKosullar = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 mr-2 flex-shrink-0 text-blue-600"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.758A3.75 3.75 0 0013.5 4.5h-4.5a4.5 4.5 0 00-4.5 4.5v3.75z" /></svg>`;
            const iconYontem = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 mr-2 flex-shrink-0 text-green-600"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0H18m-7.5 0h1.5m-1.5 0h-1.5m-1.5 0H6m7.5 0v1.5m0-1.5v-1.5m0 0v-1.5m0 1.5v1.5m0 0H9m3.75 0h3.75m-3.75 0H9m-3.75 0h3.75" /></svg>`;
            const iconNot = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 mr-2 flex-shrink-0 text-yellow-600"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>`;
            
            return `
                <div class="bg-gray-50 p-4 rounded-lg border shadow-sm relative">
                    <button class="delete-btn absolute top-3 right-3 text-red-500 hover:text-red-700 text-2xl font-bold" data-id="${doc.id}">&times;</button>
                    <p class="font-semibold text-lg text-blue-800 pr-8">${k.balik_adi || 'N/A'}</p>
                    <p class="text-xs text-gray-500 mb-2">${new Date(k.tarih).toLocaleString('tr-TR')} - ${konumBilgisi}</p>
                    
                    ${fotoHTML} 

                    <div class="space-y-2 mt-3">
                        <div class="flex items-start text-sm">
                            ${iconKosullar}
                            <span><strong>Koşullar:</strong> Puan ${k.tavsiye_puanı || '?'}, ${k.hava_durumu?.aciklama || 'N/A'}, ${k.gun_zamani?.isim || 'N/A'}</span>
                        </div>
                        <div class="flex items-center text-sm">
                            ${iconYontem}
                            <span><strong>Yöntem:</strong> ${k.yontem || 'N/A'}</span>
                        </div>
                        ${k.notlar ? `
                        <div class="flex items-start text-sm bg-yellow-100 p-2 rounded">
                            ${iconNot}
                            <span><strong>Not:</strong> ${k.notlar}</span>
                        </div>` : ''}
                    </div>
                    
                    ${haritaHTML}
                </div>`;
        }).join('');

        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleKayitSil));
        setTimeout(() => {
            querySnapshot.docs.forEach(doc => {
                const k = doc.data();
                if (k.konum?.enlem) {
                    const mapId = `map-${doc.id}`;
                    const mapElement = document.getElementById(mapId);
                    if (mapElement && mapElement._leaflet_id === undefined) { 
                        const lat = k.konum.enlem;
                        const lon = k.konum.boylam;
                        const miniMap = L.map(mapId, {
                            center: [lat, lon],
                            zoom: 12,
                            zoomControl: false,
                            dragging: false,
                            scrollWheelZoom: false
                        });
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(miniMap);
                        L.marker([lat, lon]).addTo(miniMap);
                    }
                }
            });
        }, 100);

    } catch (error) {
        kayitListesi.innerHTML = '<p class="text-center text-red-500">Kayıtlar yüklenirken bir hata oluştu.</p>';
        console.error("Defter açma hatası:", error);
    }
}

async function handleKayitSil(e) {
    const docId = e.target.dataset.id;
    const kayitElementi = e.target.closest('.bg-gray-50');
    if (confirm("Bu kaydı silmek istediğinizden emin misiniz?")) {
        try {
            await deleteDoc(doc(db, `users/${currentUser.uid}/kayitlar`, docId));
            kayitElementi.style.transition = 'opacity 0.3s ease';
            kayitElementi.style.opacity = '0';
            setTimeout(() => kayitElementi.remove(), 300);
        } catch (error) {
            alert("Silme işlemi sırasında bir hata oluştu: " + error.message);
        }
    }
}

async function showFishList(fishType) {
    const filteredFish = window.BALIK_LISTESI_VERISI.filter(fish => fish.tip === fishType);
    balikListesiBaslik.textContent = fishType === 'tuzlu_su' ? 'Tuzlu Su Balıkları' : 'Tatlı Su Balıkları';
    
    balikListesiIcerik.innerHTML = filteredFish.map(fish => {
        const gorselHTML = fish.gorsel_url
            ? `<img src="/static/images/${fish.gorsel_url}" alt="${fish.isim}" class="w-full h-40 object-contain bg-gray-100 rounded-t-lg">`
            : '<div class="w-full h-40 bg-gray-200 rounded-t-lg flex items-center justify-center text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" class="bi bi-image" viewBox="0 0 16 16"><path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/><path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/></svg></div>';

        const yemlerHTML = (fish.yemler && fish.yemler.length > 0)
            ? fish.yemler.map(yem => `<span class="bg-blue-100 text-blue-800 text-xs font-medium inline-block me-2 mb-2 px-2.5 py-0.5 rounded-full">${yem}</span>`).join('')
            : '<span class="text-gray-500">N/A</span>';

        return `
        <div class="bg-white rounded-lg shadow-md border hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
            ${gorselHTML}
            <div class="p-4 flex-grow flex flex-col">
                <h3 class="text-xl font-semibold text-blue-800 mb-2">${fish.isim}</h3>
                <p class="text-gray-600 text-sm mb-4"><strong class="font-medium">Yaşam Alanı:</strong> ${fish.yasam_alani || 'N/A'}</p>
                <div class="mt-auto">
                    <h4 class="font-medium text-gray-700 text-sm mb-2">Popüler Yemler:</h4>
                    <div class="flex flex-wrap">
                        ${yemlerHTML}
                    </div>
                </div>
            </div>
        </div>`
    }).join('');
    
    balikListesiBolumu.classList.remove('hidden');
    balikListesiBolumu.scrollIntoView({ behavior: 'smooth' });
    mobileMenu.classList.add('hidden');
}

function openAccountModal(user) {
    if (!user) return;
    accountNameInput.value = user.displayName || '';
    currentPasswordInput.value = '';
    newPasswordInput.value = '';
    accountErrorDiv.classList.add('hidden');
    accountModal.classList.remove('hidden');
}

async function fetchPublicCatches(lat, lon) {
    const container = document.getElementById('public-catches-alani');
    if (!container) return;

    container.innerHTML = `
        <h3 class="text-xl font-bold text-gray-800">Bölgedeki Son Av Raporları</h3>
        <p class="text-sm text-gray-500">Raporlar yükleniyor...</p>`;
    container.classList.remove('hidden');

    try {

        const latRange = 0.2; 
        const lonRange = 0.2; 
        const q = query(
            collection(db, "public_catches"),
            where("konum.enlem", ">=", lat - latRange),
            where("konum.enlem", "<=", lat + latRange),
            orderBy("konum.enlem"), 
            orderBy("tarih", "desc"), 
            limit(10) 
        );

        const querySnapshot = await getDocs(q);

        const filteredCatches = querySnapshot.docs
            .map(doc => doc.data())
            .filter(data => 
                data.konum.boylam >= (lon - lonRange) && 
                data.konum.boylam <= (lon + lonRange)
            );

        if (filteredCatches.length === 0) {
            container.innerHTML = `
                <h3 class="text-xl font-bold text-gray-800">Bölgedeki Son Av Raporları</h3>
                <p class="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">Bu bölgede yakın zamanda paylaşılmış bir av raporu bulunamadı. İlk paylaşan siz olun!</p>`;
            return;
        }

        const catchesHTML = filteredCatches.map(renderPublicCatch).join('');
        container.innerHTML = `
            <h3 class="text-xl font-bold text-gray-800">Bölgedeki Son Av Raporları</h3>
            ${catchesHTML}`;

    } catch (error) {
        console.error("Herkese açık avları çekerken hata:", error);
        container.innerHTML = `
            <h3 class="text-xl font-bold text-gray-800">Bölgedeki Son Av Raporları</h3>
            <p class="text-sm text-red-500">Av raporları yüklenirken bir hata oluştu.</p>`;
    }
}

function renderPublicCatch(data) {
    const tarih = new Date(data.tarih).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    
    const fotoHTML = data.foto_url
        ? `<img src="${data.foto_url}" alt="${data.balik_adi}" class="w-full h-40 object-cover rounded-lg my-2 cursor-pointer" onclick="window.open('${data.foto_url}', '_blank')">`
        : '';

    const puanHTML = data.tavsiye_puanı 
        ? `<span class="font-bold text-blue-600">(Puan: ${data.tavsiye_puanı}/10)</span>` 
        : '';

    return `
        <div class="bg-white p-4 rounded-lg shadow-md border flex gap-4">
            <div class="flex-shrink-0">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(data.userName)}&background=random&size=48" alt="${data.userName}" class="w-12 h-12 rounded-full">
            </div>
            <div class="flex-grow">
                <div class="flex justify-between items-center">
                    <span class="font-semibold text-gray-900">${data.userName}</span>
                    <span class="text-xs text-gray-500">${tarih}</span>
                </div>
                <p class="text-lg font-bold text-blue-800">${data.balik_adi} ${puanHTML}</p>
                <p class="text-sm text-gray-600 mt-1"><strong>Yöntem:</strong> ${data.yontem || 'N/A'}</p>
                ${fotoHTML}
                ${data.notlar ? `<p class="text-sm text-gray-800 bg-gray-50 p-2 mt-2 rounded border italic">"${data.notlar}"</p>` : ''}
                <p class="text-xs text-gray-400 mt-2">Konum: ${data.konum.tespit_edilen_sehir || 'Yakınlarda'}</p>
            </div>
        </div>
    `;
}