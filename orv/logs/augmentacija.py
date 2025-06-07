import cv2
import numpy as np
import os
import random
inMapa = 'input/'
outMapa = 'trainingData/'
for folder in [outMapa, outMapa + "all/", outMapa + "d80/", outMapa + "d20/"]:
    if os.path.exists(folder):
        for f in os.listdir(folder):
            file_path = os.path.join(folder, f)
            if os.path.isfile(file_path):
                os.remove(file_path)
os.makedirs(outMapa, exist_ok=True)
os.makedirs(outMapa+"all/", exist_ok=True)
os.makedirs(outMapa+"d80/", exist_ok=True)
os.makedirs(outMapa+"d20/", exist_ok=True)



def uporabi_filter(img, matrika, rocno):
    if rocno:
        h, w, c = img.shape
        kh, kw = matrika.shape
        pad_h = kh // 2
        pad_w = kw // 2
        img_padded = np.pad(img, ((pad_h, pad_h), (pad_w, pad_w), (0, 0)), mode='reflect')
        out = np.zeros_like(img)
        for y in range(h):
            print("Vrsta:", y + 1, "od", h)
            for x in range(w):
                for ch in range(c):
                    region = img_padded[y:y+kh, x:x+kw, ch]
                    out[y, x, ch] = np.clip(np.sum(region * matrika), 0, 255)
        return out.astype(np.uint8)
    else:
        return cv2.filter2D(img, -1, matrika)

def rotirajSliko(img, kot):
    (h, w) = img.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, kot, 1.0)
    return cv2.warpAffine(img, M, (w, h))

def procesiraj_sliko(pot_do_slike,imeDatoteke):
    potShranjevanja = outMapa + "all/" + imeDatoteke
    img = cv2.imread(pot_do_slike)
    if img is None:
        raise FileNotFoundError(f"Slika {pot_do_slike} ni bila najdena.")

    # 1. ŠUM
    matrika = np.array([
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1]
    ], dtype='float32') / 9.0  

    brezSuma = uporabi_filter(img, matrika, 0)
    cv2.imwrite(potShranjevanja +'-mehka.jpg', brezSuma)

    #hsv = cv2.cvtColor(brezSuma, cv2.COLOR_BGR2HSV)
   # lab = cv2.cvtColor(brezSuma, cv2.COLOR_BGR2LAB)
   # cv2.imwrite(potShranjevanja +'hsv.jpg', hsv)
    #cv2.imwrite(potShranjevanja +'lab.jpg', lab)

    gray = cv2.cvtColor(brezSuma, cv2.COLOR_BGR2GRAY)
    gray_norm = cv2.normalize(gray, None, 0, 255, cv2.NORM_MINMAX)
    cv2.imwrite(potShranjevanja +'-gray.jpg', gray_norm)

    flip = np.fliplr(brezSuma)
    cv2.imwrite(potShranjevanja +'-flip.jpg', flip)

    # rotacija 15c
    rotacija = rotirajSliko(brezSuma, 5)
    cv2.imwrite(potShranjevanja +'-rotacija5.jpg', rotacija)
    # rotacija 30c
    rotacija2 = rotirajSliko(brezSuma, 10)
    cv2.imwrite(potShranjevanja +'-rotacija10.jpg', rotacija2)
    # rotacija 20c
    rotacija3 = rotirajSliko(brezSuma, 20)
    cv2.imwrite(potShranjevanja +'-rotacija20.jpg', rotacija3)
    # rotacija -10c
    rotacija4 = rotirajSliko(brezSuma, -8) 
    cv2.imwrite(potShranjevanja +'-rotacija-8.jpg', rotacija4)

    alpha = 1.5  
    beta = 0    
    contrast = cv2.convertScaleAbs(brezSuma, alpha=alpha, beta=beta)
    cv2.imwrite(potShranjevanja +'contrast.jpg', contrast)

    noise = np.random.randint(0, 50, brezSuma.shape, dtype='uint8')
    noisy = cv2.add(brezSuma, noise)
    cv2.imwrite(potShranjevanja +'noisy.jpg', noisy)

if __name__ == "__main__":
    for filename in os.listdir(inMapa):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            pot_do_slike = os.path.join(inMapa, filename)
            procesiraj_sliko(pot_do_slike,filename)


            #! Razdelitev slik 

            # nakljucno
            all_files = [f for f in os.listdir(outMapa + "all/") if os.path.isfile(os.path.join(outMapa + "all/", f))]
            random.shuffle(all_files)
            split_idx = int(0.8 * len(all_files))
            d80_files = all_files[:split_idx]
            d20_files = all_files[split_idx:]

            # 80% 
            for f in d80_files:
                src = os.path.join(outMapa + "all/", f)
                dst = os.path.join(outMapa + "d80/", f)
                img = cv2.imread(src)
                if img is not None:
                    cv2.imwrite(dst, img)

            # 20% 
            for f in d20_files:
                src = os.path.join(outMapa + "all/", f)
                dst = os.path.join(outMapa + "d20/", f)
                img = cv2.imread(src)
                if img is not None:
                    cv2.imwrite(dst, img)