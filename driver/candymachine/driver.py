#!/usr/bin/python3
import hardware, time, artnet, sys

try:
  import paho.mqtt.client as paho
except:
  print("The Paho MQTT module for Python has not been installed.")
  print("Please install the Paho MQTT module by running the following command: ")
  print("'yaourt -Syyu python-paho-mqtt'")
  sys.exit(1)

class App:
  def __init__(self):
    self._deviceManager = None
    self._running = False
    self._drawers = []
    self._onewire = []
    self.debug = False
    self.demo = False
    
    self.waitForKey = True
    self.currentKey = ''
    self.oneWireLed = False
    
    self.halted = False
    self.mqttc = None
    self.host = "localhost"
    self.port = 1883
    self.topic = "tkkrlab/candymachine"
    
  def handle_exception(self, exctype, value, traceback):
    if exctype==KeyboardInterrupt:
      sys.exit(0)
    print("EXCEPTION:",exctype,value,traceback)
    sys.exit(1)

  def halt(self,text=""):
    print("HALT:",text)
    sys.exit(1)


  def on_logout(self):
    self.currentKey = ""
    self.waitForKey = True

  def on_message(self, mosq, obj, msg):
    try:
      payload = msg.payload.decode('utf-8')
    except:
      return
    if msg.topic == self.topic+"/vend":
      try:
        self.vend(int(payload))
      except Exception as e:
        print("[MQTT] Error while vending", e)
    elif msg.topic == self.topic+"/nudge":
      try:
        self.vend(int(payload), True)
      except Exception as e:
        print("[MQTT] Error while nudgeing", e)
    elif msg.topic == self.topic+"/ibutton/led":
      try:
        self._deviceManager.setOnewireLedByte(int(payload))
      except Exception as e:
        print("[MQTT] Error while setting led", e)
    else:
      print("[MQTT] Topic not handled",msg.topic, payload)
    

  def on_subscribe(self, mosq, obj, mid, granted_qos):
    print("[MQTT] Subscribed.")

  def on_connect(self, mosq, userdata, flags, rc):
    if (rc==0):
      mosq.subscribe(self.topic+"/vend", 0)
      mosq.subscribe(self.topic+"/nudge", 0)
      mosq.subscribe(self.topic+"/ibutton/led", 0)
    else:
      print("Fatal error: Could not connect to the MQTT server. (rc="+str(rc)+")")
      sys.exit(1)

  def debugPrint(self, message):
    print("[DEBUG]",message)
    self.mqttc.publish(self.topic+"/debug", payload=message, qos=0, retain=False)

  def on_init(self, server, port, dev=False, demo=False):
    self.server = server
    self.port = port
    self.dev = dev
    self.demo = demo
    
    self.mqttc = paho.Client()
    self.mqttc.on_message = self.on_message
    self.mqttc.on_connect = self.on_connect
    self.mqttc.on_subscribe = self.on_subscribe
    print("[MQTT] Connecting to MQTT server ("+self.server+":"+str(self.port)+")...")
    self.mqttc.connect(self.server, self.port, 60)
    self.mqttc.loop_start()

    #sys.excepthook = self.handle_exception
        
    self._running = True
    self._deviceManager = hardware.DeviceManager(self.debugPrint, self.halt, self.sleep, self.on_state, self.on_key)
    self._drawers = self._deviceManager.getDrawers()
    self._onewire = self._deviceManager.getOnewire()
    
    #for drawer in self._drawers:
    #  drawer.setStateCb(self.on_state)

    #for onewire in self._onewire:
    #  onewire.setKeyCb(self.on_key)
    #  onewire.setStateCb(self.on_state)

    if not dev and not demo:
      if (len(self._drawers)!=6):
        print("Could not find all 6 drawers!")
        sys.exit(1)
      if (len(self._onewire)!=1):
        print("Could not find the iButton reader!")
        sys.exit(1)
        
    #And fix the sorting (la 0 zit op positie 4) (NO LONGER NEEDED)
    #self._drawers[0].setPosition(4)
    #self._drawers[4].setPosition(0)
    #self._deviceManager.sort()
    #self._drawers = self._deviceManager.getDrawers()
    
    artnet.init()
    
  def on_loop(self):
    self.handleArtnet()
    if not self._deviceManager is None:
      self._deviceManager.update()
      
    pass

  def isBusy(self):
    deviceManagerBusy = True
    if not self._deviceManager is None:
      deviceManagerBusy = self._deviceManager.isBusy()
    return deviceManagerBusy or self.halted #or self.waitForKey

  def vend(self, location, nudge=False):
    try:
      location = str(location)
      unit = -1
      pos = -1
      if (len(location)==2):
        unit = int(location[0])-1
        pos = int(location[1])-1
      if (len(location)!=2) or (unit<0) or (unit>5) or (pos<0) or (pos>=len(self._drawers)):
        return False
      if nudge:
        self._drawers[unit].nudge(pos)
      else:
        self._drawers[unit].dispense(pos)
    except Exception as e:
      print(e)
      
  def on_cleanup(self):
    pass
    
  def on_execute(self, server, port, dev=False, demo=False):
    if self.on_init(server, port, dev, demo) == False:
      self._running = False

    while( self._running ):
      self.on_loop()
    self.on_cleanup()

  def showPos(self):
    for i in range(0,len(self._drawers)):
      self._drawers[i].setAllLeds(0,0,0)
      self._drawers[i].setLed(drawers[i].getPosition(),255,0,0,0)
      self._drawers[i].updateLeds()

  def handleArtnet(self):
    dmx = artnet.receive()
    if dmx:
      for u in range(0,len(self._drawers)):
        for led in range(0,9):
          try:
            r = dmx[u*9*3+led*3]
            g = dmx[u*9*3+led*3+1]
            b = dmx[u*9*3+led*3+2]
          except:
            r = 0
            g = 0
            b = 0
          self._drawers[u].setLed(led,r,g,b)
        self._drawers[u].updateLeds()
        
  def sleep(self, t):
    remaining = t*1000
    while remaining > 0:
      remaining -= 1
      self.on_loop()
      time.sleep(0.001)

  def on_state(self, id, state):
    self.mqttc.publish(self.topic+"/state", payload='{"id":'+str(id)+', "state":"'+state+'"}', qos=0, retain=False)

  def on_key(self, key, type):
    self._deviceManager.setOnewireLed(False)
    self.oneWireLed = False
    self.waitForKey = False
    self.currentKey = key
    print("[TOKEN] "+type+") "+key)
    self.mqttc.publish(self.topic+"/ibutton", payload=key, qos=0, retain=False)

if __name__ == "__main__" :
    app = App()
    dev = False
    demo = False
    if len(sys.argv) > 1:
      dev = int(sys.argv[1])&0x01
    if len(sys.argv) > 2:
      demo = int(sys.argv[2])&0x01
    if dev:
      print("Development mode enabled!")
    if demo:
      print("Demonstration mode enabled!")

    server = "10.42.1.2"
    port = 1883

    app.on_execute(server, port, dev, demo)
