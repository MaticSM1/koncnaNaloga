import cv2
import numpy as np
import os
import random
inMapa = 'input/'
outMapa = 'data/'
for folder in [outMapa, outMapa + "all/", outMapa + "train/person1/", outMapa + "test/person1/"]:
    if os.path.exists(folder):
        for f in os.listdir(folder):
            file_path = os.path.join(folder, f)
            if os.path.isfile(file_path):
                os.remove(file_path)
os.makedirs(outMapa, exist_ok=True)
os.makedirs(outMapa+"all/", exist_ok=True)
os.makedirs(outMapa+"train/person1/", exist_ok=True)
os.makedirs(outMapa+"test/person1/", exist_ok=True)



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
    print(f"Procesiram sliko: {pot_do_slike}")
    potShranjevanja = outMapa + "all/" + imeDatoteke
    img = cv2.imread(pot_do_slike)
    h, w = img.shape[:2]
    new_w = 800
    new_h = int(h * (new_w / w))
    img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
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

    # ostro
    matrikaOstro = np.array([[0, -1, 0],
                               [-1, 5, -1],
                               [0, -1, 0]])
    ostro = uporabi_filter(brezSuma, matrikaOstro, 0)
    cv2.imwrite(potShranjevanja + '-ostro.jpg', ostro)

    matrikaTest = np.array([[1, 1, 1],
                           [2, 2, 2],
                           [1, 1, 0]], dtype='float32') / 9.0
    testSlika = uporabi_filter(brezSuma, matrikaTest, 0)
    cv2.imwrite(potShranjevanja + '-test.jpg', testSlika)

    # na eni strani ozja
    cols = brezSuma.shape[1]
    rows = brezSuma.shape[0]
    map_x = np.zeros((rows, cols), dtype=np.float32)
    map_y = np.zeros((rows, cols), dtype=np.float32)
    for y in range(rows):
        for x in range(cols):
            mocStiska = 1 - 0.5 * (x / (cols - 1))
            map_x[y, x] = x * mocStiska
            map_y[y, x] = y
    stisnjena = cv2.remap(brezSuma, map_x, map_y, interpolation=cv2.INTER_LINEAR)
    cv2.imwrite(potShranjevanja + '-stisnjena.jpg', stisnjena)

    # senca
    shadow = np.zeros_like(brezSuma)    
    shadow[:] = (50, 50, 50)
    shadowed = cv2.addWeighted(brezSuma, 1, shadow, 0.5, 0)
    cv2.imwrite(potShranjevanja + '-senca.jpg', shadowed)

    # dodaj prah 
    num_pixels = 1000
    for _ in range(num_pixels):
        y = random.randint(0, brezSuma.shape[0] - 1)
        x = random.randint(0, brezSuma.shape[1] - 1)
        brezSuma[y, x] = (200, 200, 200) # siva
    cv2.imwrite(potShranjevanja + '-prah.jpg', brezSuma)






if __name__ == "__main__":
    for filename in os.listdir(inMapa):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            pot_do_slike = os.path.join(inMapa, filename)
            procesiraj_sliko(pot_do_slike,filename)


            #! Razdelitev slik 

            all_files = [f for f in os.listdir(outMapa + "all/") if os.path.isfile(os.path.join(outMapa + "all/", f))]
            random.shuffle(all_files)
            split_idx = int(0.8 * len(all_files))
            d80_files = all_files[:split_idx]
            d20_files = all_files[split_idx:]

            for f in d80_files:
                src = os.path.join(outMapa + "all/", f)
                dst = os.path.join(outMapa + "train/person1/", f)
                img = cv2.imread(src)
                if img is not None:
                    cv2.imwrite(dst, img)

            for f in d20_files:
                src = os.path.join(outMapa + "all/", f)
                dst = os.path.join(outMapa + "/test/person1/", f)
                img = cv2.imread(src)
                if img is not None:
                    cv2.imwrite(dst, img)
