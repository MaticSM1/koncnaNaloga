import requests
import os
from PIL import Image
from io import BytesIO

os.makedirs("input", exist_ok=True)

for i in range(20):
    url = f"https://z7.si/wisfi/orvinput/{i}.jpg"
    output_path = f"input/{i}.jpg"
    response = requests.get(url)
    if response.status_code == 200:
        with open(output_path, "wb") as f:
            f.write(response.content)
        with Image.open(output_path) as img:
            width = img.width
            ratio = width / img.width
            height = int(img.height * ratio)
            img = img.resize((width, height), Image.LANCZOS)
            img.save(output_path)
        print(f"Slika {i}.jpg snajena {output_path}")

   