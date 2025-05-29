import cv2
from pyzbar.pyzbar import decode
import requests
from bs4 import BeautifulSoup

def pridobi_hranilno_tabelo(ean_koda):
    url = f"https://veskajjes.si/component/finder/search?q={ean_koda}"
    headers = {
        'User-Agent': 'Mozilla/5.0'
    }

    response = requests.get(url, headers=headers)

    soup = BeautifulSoup(response.content, 'html.parser')
    tabela = soup.find('table', {'class': 'vzstatus-table'})

    if not tabela:
        print("Tabela ni nbila najdena.")
        return

    print("\n Hranilna tabela za", ean_koda, ":\n")

    for vrstica in tabela.find_all('tr'):
        celice = vrstica.find_all(['td', 'th'])
        podatki = [c.text.strip() for c in celice]
        if podatki:
            print(f"- {' : '.join(podatki)}")

def preberi_qr_kodo_in_pridobi_podatke(pot_do_slike):
    slika = cv2.imread(pot_do_slike)
    kode = decode(slika)

    if not kode:
        print("QR koda ni bila najdena.")
        return

    for koda in kode:
        podatki = koda.data.decode('utf-8')

        try:
            ean = str(int(podatki))
            print("Najdena številka (EAN):", ean)
            pridobi_hranilno_tabelo(ean)
        except ValueError:
            print("QR koda ne vsebuje veljavne številke:", podatki)
            continue

        (x, y, w, h) = koda.rect
        cv2.rectangle(slika, (x, y), (x + w, y + h), (0, 255, 0), 2)

preberi_qr_kodo_in_pridobi_podatke("IMG_0772.webp")
