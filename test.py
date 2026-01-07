import socket

HOST = '192.168.1.91'  
PORT = 3000             


with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.bind((HOST, PORT))
    s.listen()
    print(f"Server posluša na {HOST}:{PORT}")

    conn, addr = s.accept()  
    with conn:
        print(f"Povezan s {addr}")
        while True:
            data = conn.recv(1024) 
            if not data:
                break
            print(f"Prejeto: {data.decode('utf-8')}")
  
            conn.sendall(b"Received\n")
