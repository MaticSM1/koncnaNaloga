from flask import Flask
import subprocess

app = Flask(__name__)

def run_all_py():
    subprocess.Popen(['python', 'all.py'])

@app.route('/')
def home():
    run_all_py()
    return "ok"



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)