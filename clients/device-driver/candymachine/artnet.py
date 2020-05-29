import socket

sock = None

def init(port=6454):
  global sock
  sock = socket.socket(socket.AF_INET,socket.SOCK_DGRAM)
  sock.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1)
  sock.bind(('',port))
  sock.setblocking(0)

def receive():
  if sock is None:
    init()
  try:
    data = sock.recv(10240)
  except:
    #print("no data")
    return False
  if len(data) < 20:
    print("Length < 20")
    return False
  if data[0:7].decode('ascii') != "Art-Net" or data[7] != 0:
    print("Not artnet data")
    return False
  if data[8] != 0x00 or data[9] != 0x50:
    print("Not opDmx")
    return False
  protverhi = data[10]
  protverlo = data[11]
  sequence  = data[12]
  physical  = data[13]
  subuni    = data[14]
  net       = data[15]
  lengthhi  = data[16]
  length    = data[17]
  dmx = data[18:]
  #print(length,dmx)
  #return (protverhi,protverlo,sequence,physical,subuni,net,lengthhi,length,dmx)
  return dmx
