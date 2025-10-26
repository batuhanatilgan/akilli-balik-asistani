from flask import Flask, jsonify, render_template, request, redirect, url_for, flash, session
import requests
import json
import os
from astral.moon import phase
from flask_mail import Mail, Message
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone, date

load_dotenv()
app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False
app.config['SECRET_KEY'] = os.urandom(24) 
API_KEY = os.getenv("OPENWEATHER_API_KEY")
if not API_KEY:
    raise ValueError("Hata: OPENWEATHER_API_KEY ortam değişkeni ayarlanmamış!")

STORMGLASS_KEY = os.getenv("STORMGLASS_API_KEY")
if not STORMGLASS_KEY:
    raise ValueError("Hata: STORMGLASS_API_KEY ortam değişkeni ayarlanmamış!")

TIDE_CACHE = {}

app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 465
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_USE_TLS'] = False
app.config['MAIL_USE_SSL'] = True
mail = Mail(app)
def veritabani_yukle():
    try:
        with open('baliklar.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

BALIK_VERITABANI = veritabani_yukle()



SEHIR_BOLGE_MAP = {
    "istanbul": ["marmara", "karadeniz"],
    "kocaeli": ["marmara", "karadeniz"],
    "tekirdag": ["marmara", "karadeniz"], 
    "canakkale": ["marmara", "ege"],
    "balikesir": ["marmara", "ege"],
    "mugla": ["ege", "akdeniz"],

 
    "kirklareli": ["karadeniz"], 
    "sakarya": ["karadeniz"],
    "duzce": ["karadeniz"],
    "zonguldak": ["karadeniz"],
    "bartin": ["karadeniz"],
    "kastamonu": ["karadeniz"],
    "sinop": ["karadeniz"],
    "samsun": ["karadeniz"],
    "ordu": ["karadeniz"],
    "giresun": ["karadeniz"],
    "trabzon": ["karadeniz"],
    "rize": ["karadeniz"],
    "artvin": ["karadeniz"],


    "yalova": ["marmara"],
    "bursa": ["marmara"],

    "edirne": ["ege"], 
    "izmir": ["ege"],
    "aydin": ["ege"],

    "antalya": ["akdeniz"],
    "mersin": ["akdeniz"],
    "adana": ["akdeniz"],
    "hatay": ["akdeniz"],
}
def get_coords_from_city(city_name, api_key):
    city_name_fixed = normalize_city_name(city_name) 
    geo_url = f"http://api.openweathermap.org/geo/1.0/direct?q={city_name_fixed},TR&limit=1&appid={api_key}"
    try:
        response = requests.get(geo_url)
        response.raise_for_status()
        data = response.json()
        if data: return {"lat": data[0]['lat'], "lon": data[0]['lon']}
        return None
    except requests.exceptions.RequestException: return None

def get_weather_data(api_key, lat, lon):
    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric&lang=tr"
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        return {"sehir": data.get('name', 'Bilinmiyor').lower(), "aciklama": data['weather'][0]['description'].capitalize(), "sicaklik_C": data['main']['temp'],"basinc_hPa": data['main']['pressure'],"ruzgar_hizi_mps": data['wind']['speed'], "ruzgar_yonu_derece": data['wind'].get('deg'), "gun_dogumu": data['sys']['sunrise'],"gun_batimi": data['sys']['sunset'],"saat_dilimi_farki": data['timezone']}
    except requests.exceptions.RequestException: return None
    
def normalize_city_name(city_name):
    """Şehir adlarındaki Türkçe karakterleri API uyumlu hale getirir."""
    if not city_name: return ""
    return city_name.replace('İ', 'I') \
                    .lower() \
                    .replace('ı', 'i') \
                    .replace('ğ', 'g') \
                    .replace('ü', 'u') \
                    .replace('ş', 's') \
                    .replace('ö', 'o') \
                    .replace('ç', 'c')

def get_weather_forecast(api_key, lat, lon):
    url = f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={api_key}&units=metric&lang=tr"
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException: return None
def get_location_details(lat, lon):
    geo_url = f"https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={lat}&longitude={lon}&localityLanguage=tr"
    try:
        response = requests.get(geo_url)
        response.raise_for_status() 
        data = response.json()
        if data and data.get('principalSubdivision'):
            il_adi = data.get('principalSubdivision')
            return {"il_adi": il_adi}
        else:
            return {"il_adi": "Bilinmiyor"} 
            
    except requests.exceptions.RequestException as e:
        print(f"BigDataCloud API Hatası: {e}") 
        return None

def get_moon_phase():
    p = phase(date.today())
    if p < 1.0 or p > 27.0: return {"isim": "Yeni Ay", "emoji": "🌑"}
    elif 13.0 < p < 15.0: return {"isim": "Dolunay", "emoji": "🌕"}
    else: return {"isim": "Ara Evre", "emoji": "🌗"}

def get_time_of_day(weather_data):
    if not weather_data: return {"id": "bilinmiyor", "isim": "Bilinmiyor", "emoji": "❓"}
    now_utc = datetime.now(timezone.utc)
    timezone_offset = timedelta(seconds=weather_data['saat_dilimi_farki'])
    now_local = now_utc + timezone_offset
    sunrise_local = datetime.fromtimestamp(weather_data['gun_dogumu'], tz=timezone.utc) + timezone_offset
    sunset_local = datetime.fromtimestamp(weather_data['gun_batimi'], tz=timezone.utc) + timezone_offset
    
    if (sunrise_local - timedelta(hours=1)) <= now_local <= (sunrise_local + timedelta(hours=1)): return {"id": "gun_dogumu", "isim": "Gündoğumu Vakti", "emoji": "🌅"}
    elif (sunset_local - timedelta(hours=1)) <= now_local <= (sunset_local + timedelta(hours=1)): return {"id": "gun_batimi", "isim": "Günbatımı Vakti", "emoji": "🌇"}
    
    elif sunrise_local < now_local < sunset_local: return {"id": "gunduz", "isim": "Gündüz", "emoji": "☀️"}
    else: return {"id": "gece", "isim": "Gece", "emoji": "🌃"}
    
def get_tide_data(lat, lon):
   
    today_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    cache_key = f"{round(lat, 1)}-{round(lon, 1)}-{today_str}"

    tide_status_error = {"durum": "bilinmiyor", "durum_aciklamasi": "Bilinmiyor"}
    TIDE_CACHE[cache_key] = tide_status_error 
    return tide_status_error

    
    if cache_key in TIDE_CACHE:
        return TIDE_CACHE[cache_key]

    try:

        params = {
            'lat': lat,
            'lng': lon,
            'params': 'tideExtremes', 
            'start': datetime.now(timezone.utc).timestamp(),
            'end': (datetime.now(timezone.utc) + timedelta(days=1)).timestamp(),
        }
        
        response = requests.get(
            'https://api.stormglass.io/v2/tide/extremes/point',
            params=params,
            headers={'Authorization': STORMGLASS_KEY}
        )
        response.raise_for_status()
        data = response.json()
        
        if not data.get('data'):
            raise Exception("Stormglass'tan 'data' anahtarı alınamadı.")

        extremes = data['data']
        now_utc = datetime.now(timezone.utc)
        
        next_high = None
        next_low = None
        
        for e in sorted(extremes, key=lambda x: x['time']):
            extreme_time = datetime.fromisoformat(e['time'])
            if extreme_time > now_utc:
                if e['type'] == 'high' and not next_high:
                    next_high = extreme_time
                elif e['type'] == 'low' and not next_low:
                    next_low = extreme_time
            if next_high and next_low:
                break 
        
        tide_status = {"durum": "durgun", "durum_aciklamasi": "Durgun ⏸️"} 

        if next_high and next_low:
            if next_high < next_low:
                tide_status = {"durum": "yukselen", "durum_aciklamasi": "Yükseliyor 🌊"}
            else:
                tide_status = {"durum": "alcalan", "durum_aciklamasi": "Alçalıyor ↘️"}
        
        TIDE_CACHE[cache_key] = tide_status
        return tide_status

    except Exception as e:
        print(f"Stormglass API Hatası (Cache Key: {cache_key}): {e}")
        tide_status_error = {"durum": "bilinmiyor", "durum_aciklamasi": "Bilinmiyor"}
        TIDE_CACHE[cache_key] = tide_status_error 
        return tide_status_error
    
def derece_to_yon(derece):
    """Rüzgar yönünü dereceden ana ve ara yönlere çevirir."""
    if derece is None:
        return "Bilinmiyor"
    val = int((derece / 22.5) + 0.5)
    yonler = ["K", "KKB", "KB", "BKB", "B", "BGB", "GB", "GGB", "G", "GGD", "GD", "DGD", "D", "DKD", "KD", "KKD"]
    return yonler[(val % 16)]

def akilli_tavsiye_olustur(hedef_balik_id, hava_durumu, ay_evresi, gun_zamani, gelgit_verisi=None):
    if not hava_durumu:
        return {"puan": 0, "ipucu": "Hava durumu verisi alınamadı, puanlama yapılamıyor."}
    puan = 1 
    sezon_puani = 2 
    basinc_puani = 0.5 

    spesifik_ipuclari = [] 
    genel_ipuclari = []    

    mevcut_ay = date.today().month
    balik_bilgisi = BALIK_VERITABANI.get(hedef_balik_id, {})

    if mevcut_ay in balik_bilgisi.get("sezon_aylari", []):
        puan += sezon_puani
        genel_ipuclari.append(f"Şu an tam {balik_bilgisi.get('isim')} sezonu.")
    
    basinc = hava_durumu.get('basinc_hPa') or hava_durumu.get('main', {}).get('pressure')
    if basinc and 1005 <= basinc <= 1018:
        puan += basinc_puani
        genel_ipuclari.append("Hava basıncı balıkların yemlenmesi için ideal.")

    if "akilli_kurallar" in balik_bilgisi:
        gun_zamani_id = gun_zamani.get("id")
        ruzgar_hizi_mps = hava_durumu.get('ruzgar_hizi_mps') or hava_durumu.get('wind', {}).get('speed', 0)
        ruzgar_hizi_kmh = ruzgar_hizi_mps * 3.6
        ruzgar_derecesi = hava_durumu.get('ruzgar_yonu_derece')
        ruzgar_yonu_str = derece_to_yon(ruzgar_derecesi)

        sicaklik = hava_durumu.get('sicaklik_C') or hava_durumu.get('main', {}).get('temp')
        hava_aciklamasi = hava_durumu.get('aciklama') or hava_durumu.get('weather', [{}])[0].get('description', '').lower()

        for kural in balik_bilgisi["akilli_kurallar"]:
            uygulandi = False
            kural_tipi = kural.get("kural_tipi")
            operator = kural.get("operator")
            deger = kural.get("deger")
            puan_etkisi = kural.get("puan_etkisi", 0)
            ipucu = kural.get("ipucu", "")

            try: 
                if kural_tipi == "ruzgar" and operator and deger is not None:
                    if (operator == ">" and ruzgar_hizi_kmh > deger) or \
                       (operator == "<" and ruzgar_hizi_kmh < deger):
                        uygulandi = True
                elif kural_tipi == "ruzgar_yonu" and operator == "esittir" and deger and ruzgar_yonu_str == deger:
                     uygulandi = True
                elif kural_tipi == "ay_evresi" and operator == "esittir" and deger and ay_evresi["isim"] == deger:
                    uygulandi = True
                elif kural_tipi == "gun_zamani" and operator == "esittir" and deger and gun_zamani_id == deger:
                    uygulandi = True
                elif kural_tipi == "hava_aciklamasi" and operator == "icerir" and deger and deger in hava_aciklamasi:
                    uygulandi = True
                elif kural_tipi == "sicaklik" and sicaklik is not None and operator and deger is not None:

                    if operator == "between" and isinstance(deger, list) and len(deger) == 2:
                        if deger[0] <= sicaklik <= deger[1]:
                            uygulandi = True

                    elif (operator == ">" and sicaklik > deger) or \
                         (operator == "<" and sicaklik < deger):
                        uygulandi = True
                        
                elif kural_tipi == "gelgit" and gelgit_verisi and operator == "esittir" and deger and gelgit_verisi.get("durum") == deger:
                    uygulandi = True

                if uygulandi:
                    puan += puan_etkisi
                    spesifik_ipuclari.append(ipucu)
            except Exception as e:
                print(f"Hata: Kural işlenemedi - {kural}. Hata Mesajı: {e}")


    puan = round(max(1, min(10, puan)))
    
    final_ipucu = ""
    if spesifik_ipuclari:
        final_ipucu = " ".join(spesifik_ipuclari)
    elif genel_ipuclari:
        final_ipucu = " ".join(genel_ipuclari)
    else:
        final_ipucu = "Mevcut koşullar bu balık için özel bir avantaj sunmuyor." 
    
    return {"puan": puan, "ipucu": final_ipucu}
@app.route('/')
def index():
    full_balik_listesi = []
    for key, value in BALIK_VERITABANI.items():
        balik_objesi = value.copy()
        balik_objesi['id'] = key
        full_balik_listesi.append(balik_objesi)
    return render_template('index.html', balik_listesi=full_balik_listesi)

@app.route('/get_fish_by_location/<string:sehir_adi>', methods=['GET'])
def get_fish_by_location(sehir_adi):
    sehir_adi_fixed = normalize_city_name(sehir_adi) 
    
    koordinatlar = get_coords_from_city(sehir_adi_fixed, API_KEY)
    if not koordinatlar:
        return jsonify({"hata": f"'{sehir_adi}' şehri bulunamadı."}), 404
    
    mevcut_hava_durumu = get_weather_data(API_KEY, koordinatlar['lat'], koordinatlar['lon'])
    ay_evresi = get_moon_phase()
    gun_zamani = get_time_of_day(mevcut_hava_durumu)
    mevcut_ay = date.today().month
    sehir_bolgeleri = SEHIR_BOLGE_MAP.get(sehir_adi_fixed, []).copy()
    if not sehir_bolgeleri:
        sehir_bolgeleri = ["tatlisu_genel"]
    else:
        if "tatlisu_genel" not in sehir_bolgeleri:
            sehir_bolgeleri.append("tatlisu_genel")

    uygun_baliklar = []
    for balik_id, balik_data in BALIK_VERITABANI.items():
        if "yasal_uyari" in balik_data:
            continue
        if mevcut_ay in balik_data.get("ureme_donemi_aylar", []):
            continue
        if not any(bolge in sehir_bolgeleri for bolge in balik_data.get("bolgeler", [])):
            continue
        
        tavsiye = akilli_tavsiye_olustur(balik_id, mevcut_hava_durumu, ay_evresi, gun_zamani)
        if tavsiye['puan'] > 2:
            balik_data_kopya = balik_data.copy()
            balik_data_kopya['id'] = balik_id
            balik_data_kopya['anlik_puan'] = tavsiye['puan']
            balik_data_kopya['anlik_ipucu'] = tavsiye['ipucu']
            uygun_baliklar.append(balik_data_kopya)
    sirali_baliklar = sorted(uygun_baliklar, key=lambda x: x['anlik_puan'], reverse=True)

    return jsonify({
        "sehir": sehir_adi.capitalize(),
        "mevcut_hava_durumu": mevcut_hava_durumu,
        "ay_evresi": ay_evresi,
        "gun_zamani": gun_zamani,
        "onerilen_baliklar": sirali_baliklar
    })
@app.route('/get_recommendation_by_city/<string:balik_adi>/<string:sehir_adi>', methods=['GET'])
def get_recommendation_by_city(balik_adi, sehir_adi):
    return process_full_recommendation(balik_adi, city=sehir_adi)

@app.route('/get_recommendation/<string:balik_adi>/<float:lat>/<float:lon>', methods=['GET'])
def get_recommendation(balik_adi, lat, lon):
    return process_full_recommendation(balik_adi, lat=lat, lon=lon)

def process_full_recommendation(balik_adi, city=None, lat=None, lon=None):
    if city:
        koordinatlar = get_coords_from_city(city, API_KEY)
        if not koordinatlar:
            return jsonify({"hata": f"'{city}' şehri bulunamadı."}), 404
        lat, lon = koordinatlar['lat'], koordinatlar['lon']
    
    mevcut_hava_durumu = get_weather_data(API_KEY, lat, lon)
    if not mevcut_hava_durumu:
         return jsonify({"hata": "Hava durumu verisi alınamadı."}), 500
    
    konum_detaylari = get_location_details(lat, lon)
    if not konum_detaylari:
        return jsonify({"hata": "Konum bilgisi (il) alınamadı."}), 500

    ay_evresi = get_moon_phase()
    gun_zamani = get_time_of_day(mevcut_hava_durumu)
    mevcut_ay = date.today().month 
    
    balik_bilgisi = BALIK_VERITABANI.get(balik_adi)
    if not balik_bilgisi:
        return jsonify({"hata": "Belirtilen balık türü bulunamadı."}), 404
    
    hedef_balik_tipi = balik_bilgisi.get("tip")
    hedef_balik_bolgeleri = balik_bilgisi.get("bolgeler", [])
    
    gelgit_verisi = None
    if hedef_balik_tipi == 'tuzlu_su':
        gelgit_verisi = get_tide_data(lat, lon)

    goruntulenen_sehir_adi = mevcut_hava_durumu.get('sehir', 'Bilinmiyor')
    il_adi_raw = konum_detaylari.get('il_adi', 'Bilinmiyor')
    il_adi_temiz = il_adi_raw.replace(" ili", "").replace(" İli", "")
    il_adi_fixed = normalize_city_name(il_adi_temiz)
    
    konumun_bolgeleri = set()
    konum_denize_kiyisi_var = False
    
    matched_city_regions = SEHIR_BOLGE_MAP.get(il_adi_fixed) 
    
    if matched_city_regions:
        if any(b != "tatlisu_genel" for b in matched_city_regions):
            konum_denize_kiyisi_var = True
        konumun_bolgeleri.update(matched_city_regions)
            
    konumun_bolgeleri.add("tatlisu_genel")
    konumun_bolgeleri = list(konumun_bolgeleri)

    if hedef_balik_tipi == 'tuzlu_su' and not konum_denize_kiyisi_var:
        return jsonify({"hata": f"{balik_bilgisi['isim']}, denize kıyısı olmayan '{goruntulenen_sehir_adi.capitalize()}' bölgesinde bulunmaz."}), 400
        
    if not any(bolge in konumun_bolgeleri for bolge in hedef_balik_bolgeleri):
         return jsonify({"hata": f"{balik_bilgisi['isim']}, '{goruntulenen_sehir_adi.capitalize()}' bölgesinin genel yaşam alanlarında bulunmaz."}), 400

    ureme_uyarisi_mesaji = None 
    yasal_uyari_mesaji = None
    if "yasal_uyari" in balik_bilgisi:
        yasal_uyari_mesaji = f"**YASAL UYARI:** {balik_bilgisi['yasal_uyari']}"
    if mevcut_ay in balik_bilgisi.get("ureme_donemi_aylar", []):
        ureme_uyarisi_mesaji = f"**Dikkat:** Seçtiğiniz {balik_bilgisi['isim']} balığı şu anda üreme dönemindedir. Avlanması yasalara aykırı ve sürdürülebilirlik açısından etik değildir."

    akilli_tavsiye = akilli_tavsiye_olustur(balik_adi, mevcut_hava_durumu, ay_evresi, gun_zamani)
    
    tahmin_cizelgesi = []
    forecast_data = get_weather_forecast(API_KEY, lat, lon)
    if forecast_data:
        for item in forecast_data['list'][:8]: 
            
            item_dt_local = datetime.fromtimestamp(item['dt'], tz=timezone.utc) + timedelta(seconds=mevcut_hava_durumu['saat_dilimi_farki'])
            sunrise_local = datetime.fromtimestamp(mevcut_hava_durumu['gun_dogumu'], tz=timezone.utc) + timedelta(seconds=mevcut_hava_durumu['saat_dilimi_farki'])
            sunset_local = datetime.fromtimestamp(mevcut_hava_durumu['gun_batimi'], tz=timezone.utc) + timedelta(seconds=mevcut_hava_durumu['saat_dilimi_farki'])
            
            tahmin_gun_zamani = {"id": "bilinmiyor", "isim": "Bilinmiyor", "emoji": "❓"}
            if (sunrise_local - timedelta(hours=1)) <= item_dt_local <= (sunrise_local + timedelta(hours=1)): tahmin_gun_zamani = {"id": "gun_dogumu", "isim": "Gündoğumu", "emoji": "🌅"}
            elif (sunset_local - timedelta(hours=1)) <= item_dt_local <= (sunset_local + timedelta(hours=1)): tahmin_gun_zamani = {"id": "gun_batimi", "isim": "Günbatımı", "emoji": "🌇"}
            
            elif sunrise_local < item_dt_local < sunset_local: tahmin_gun_zamani = {"id": "gunduz", "isim": "Gündüz", "emoji": "☀️"}
            else: tahmin_gun_zamani = {"id": "gece", "isim": "Gece", "emoji": "🌃"}
            
            tahmin_tavsiyesi = akilli_tavsiye_olustur(balik_adi, item, ay_evresi, tahmin_gun_zamani, gelgit_verisi) 
            tahmin_cizelgesi.append({
                "saat": item_dt_local.strftime('%H:%M'),
                "puan": tahmin_tavsiyesi['puan'],
                "ipucu": tahmin_tavsiyesi['ipucu'],
                "sicaklik": round(item['main']['temp']),
                "ikon": item['weather'][0]['icon']
            })

    onerilen_teknikler_liste = balik_bilgisi.get("onerilen_teknikler", []) 
    sonuc = {
        "istek_yapilan_konum": {"enlem": lat, "boylam": lon, "tespit_edilen_sehir": goruntulenen_sehir_adi.capitalize()},
        "mevcut_hava_durumu": mevcut_hava_durumu,
        "balik_tavsiyesi": {
            "hedef_balik": balik_bilgisi['isim'],
            "bilimsel_isim": balik_bilgisi.get("bilimsel_isim"),
            "onerilen_yemler": balik_bilgisi.get("yemler"),
            "onerilen_teknikler": onerilen_teknikler_liste, 
            "akilli_tavsiye": akilli_tavsiye
        },
        "ay_evresi": ay_evresi,
        "gun_zamani": gun_zamani,
        "gelgit_verisi": gelgit_verisi,
        "tahmin_cizelgesi": tahmin_cizelgesi,
        "yasal_uyari": yasal_uyari_mesaji,
        "ureme_uyarisi": ureme_uyarisi_mesaji 
    }
    return jsonify(sonuc)

@app.route('/get_fish_details/<string:balik_id>', methods=['GET'])
def get_fish_details(balik_id):
    balik_detay = BALIK_VERITABANI.get(balik_id)
    if balik_detay:
        return jsonify(balik_detay)
    return jsonify({"hata": "Balık bulunamadı"}), 404

@app.route('/get_fish_by_coords/<float:lat>/<float:lon>/<string:su_tipi>', methods=['GET'])
def get_fish_by_coords(lat, lon, su_tipi):
    mevcut_hava_durumu = get_weather_data(API_KEY, lat, lon)
    if not mevcut_hava_durumu: return jsonify({"hata": "Hava durumu verisi alınamadı."}), 500
    
    konum_detaylari = get_location_details(lat, lon)
    if not konum_detaylari: return jsonify({"hata": "Konum bilgisi (il) alınamadı."}), 500
    
    goruntulenen_sehir_adi = mevcut_hava_durumu.get('sehir', 'Bilinmiyor')
    
    il_adi_raw = konum_detaylari.get('il_adi', 'Bilinmiyor')
    
    il_adi_temiz = il_adi_raw.replace(" ili", "").replace(" İli", "")
    
    il_adi_fixed = normalize_city_name(il_adi_temiz)
    
    ay_evresi = get_moon_phase()
    gun_zamani = get_time_of_day(mevcut_hava_durumu)
    mevcut_ay = date.today().month
    bolgeleri_kontrol_et = set()
    
    gelgit_verisi = None
    if su_tipi == 'tuzlu_su':
        gelgit_verisi = get_tide_data(lat, lon)
    matched_city_regions = SEHIR_BOLGE_MAP.get(il_adi_fixed)

    if su_tipi == 'tuzlu_su':
        if matched_city_regions:
            sea_regions = {b for b in matched_city_regions if b != "tatlisu_genel"}
            if not sea_regions:
                return jsonify({"hata": f"'{goruntulenen_sehir_adi.capitalize()}' ({il_adi_raw}) ilinin denize kıyısı bulunmuyor."}), 400
            bolgeleri_kontrol_et.update(sea_regions)
        else:
            return jsonify({"hata": f"'{goruntulenen_sehir_adi.capitalize()}' ({il_adi_raw}) bölgesinin denize kıyısı bulunmuyor. Lütfen tatlı su avı seçin."}), 400
    elif su_tipi == 'tatli_su':
        bolgeleri_kontrol_et.add("tatlisu_genel")
        
    uygun_baliklar = []
    uremedeki_baliklar_isimleri = []

    if bolgeleri_kontrol_et:
        for balik_id, balik_data in BALIK_VERITABANI.items():
            if balik_data.get("tip") != su_tipi or not any(bolge in bolgeleri_kontrol_et for bolge in balik_data.get("bolgeler", [])):
                continue

            if "yasal_uyari" in balik_data:
                continue
            
            if mevcut_ay in balik_data.get("ureme_donemi_aylar", []):
                uremedeki_baliklar_isimleri.append(balik_data['isim'])
                continue
            
            tavsiye = akilli_tavsiye_olustur(balik_id, mevcut_hava_durumu, ay_evresi, gun_zamani, gelgit_verisi)
            if tavsiye['puan'] > 2:
                balik_data_kopya = dict(balik_data, id=balik_id, anlik_puan=tavsiye['puan'], anlik_ipucu=tavsiye['ipucu'])
                uygun_baliklar.append(balik_data_kopya)
    if not uygun_baliklar and uremedeki_baliklar_isimleri:
        ornek_baliklar = ", ".join(uremedeki_baliklar_isimleri[:2])
        bilgi_mesaji = f"Bu bölgedeki popüler balıkların birçoğu (örn: {ornek_baliklar}) şu anda üreme döneminde olduğu için listede gösterilmiyor. Lütfen sürdürülebilir avcılığa destek olun."
        return jsonify({
            "sehir": goruntulenen_sehir_adi.capitalize(),
            "bilgi": bilgi_mesaji, 
            "onerilen_baliklar": [] 
        })
        
    sirali_baliklar = sorted(uygun_baliklar, key=lambda x: x['anlik_puan'], reverse=True)
    return jsonify({
        "sehir": goruntulenen_sehir_adi.capitalize(),
        "mevcut_hava_durumu": mevcut_hava_durumu,
        "ay_evresi": ay_evresi,
        "gun_zamani": gun_zamani,
        "gelgit_verisi": gelgit_verisi,
        "onerilen_baliklar": sirali_baliklar
    })

@app.route('/destek', methods=['POST'])
def destek_formu():
    if request.method == 'POST':
        adi_soyadi = request.form.get('adi_soyadi')
        email = request.form.get('email')
        telefon = request.form.get('telefon')
        konu = request.form.get('konu')
        mesaj = request.form.get('mesaj')
        aydinlatma_metni = request.form.get('aydinlatma_metni')

        if not aydinlatma_metni:
            flash('Lütfen aydınlatma metnini onaylayın.', 'danger')
            return redirect(url_for('index') + '#iletisim-formu')

        try:
            msg = Message(
                subject=f"Yeni Destek Talebi: {konu}",
                sender=app.config.get("MAIL_USERNAME"),
                recipients=[app.config.get("MAIL_USERNAME")],
                body=f"""
                Gönderen: {adi_soyadi}
                E-posta: {email}
                Telefon: {telefon}

                Mesaj:
                {mesaj}
                """
            )
            mail.send(msg)
            flash('Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.', 'success')
        except Exception as e:
            flash(f'Mesaj gönderilirken bir hata oluştu: {e}', 'danger')
        
        return redirect(url_for('index') + '#iletisim-formu')

if __name__ == '__main__':
    app.run()