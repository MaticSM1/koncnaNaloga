import cv2
import numpy as np
import os
inMapa = 'input/'
outMapa = 'trainingData/'
os.makedirs(outMapa, exist_ok=True)


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

def procesiraj_sliko(pot_do_slike,imeDatoteke):
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
    cv2.imwrite(outMapa + imeDatoteke +'filtered.jpg', brezSuma)

    hsv = cv2.cvtColor(brezSuma, cv2.COLOR_BGR2HSV)
    lab = cv2.cvtColor(brezSuma, cv2.COLOR_BGR2LAB)
    cv2.imwrite(outMapa + imeDatoteke +'hsv.jpg', hsv)
    cv2.imwrite(outMapa + imeDatoteke +'lab.jpg', lab)

    gray = cv2.cvtColor(brezSuma, cv2.COLOR_BGR2GRAY)
    gray_norm = cv2.normalize(gray, None, 0, 255, cv2.NORM_MINMAX)
    cv2.imwrite(outMapa + imeDatoteke +'gray.jpg', gray_norm)

    flip = np.fliplr(brezSuma)
    cv2.imwrite(outMapa + imeDatoteke +'flip.jpg', flip)

    (h, w) = brezSuma.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, 15, 1.0)
    rotated = cv2.warpAffine(brezSuma, M, (w, h))
    cv2.imwrite(outMapa + imeDatoteke +'rotated.jpg', rotated)

    alpha = 1.5  
    beta = 0    
    contrast = cv2.convertScaleAbs(brezSuma, alpha=alpha, beta=beta)
    cv2.imwrite(outMapa + imeDatoteke +'contrast.jpg', contrast)

    noise = np.random.randint(0, 50, brezSuma.shape, dtype='uint8')
    noisy = cv2.add(brezSuma, noise)
    cv2.imwrite(outMapa + imeDatoteke +'noisy.jpg', noisy)

if __name__ == "__main__":
    for filename in os.listdir(inMapa):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            pot_do_slike = os.path.join(inMapa, filename)
            procesiraj_sliko(pot_do_slike,filename)
