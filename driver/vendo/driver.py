#!/usr/bin/python3
import hardware, time, sys

try:
  import paho.mqtt.client as paho
except:
  print("The Paho MQTT module for Python has not been installed.")
  print("Please install the Paho MQTT module")
  sys.exit(1)

class App:
  def __init__(self):
    self._deviceManager = None
    self._running = False
    self._drawers = []
    self._onewire = []
    self._frontpanel = []
    self.coin = []
    self.debug = False
    
    self.waitForKey = True
    self.currentKey = ''
    self.oneWireLed = False
    
    self.halted = False
    self.mqttc = None
    self.host = "localhost"
    self.port = 1883
    self.topic = "tkkrlab/vendo"
    
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
    elif msg.topic == self.topic+"/frontpanel/led":
      try:
        self.fpLed(int(payload))
      except Exception as e:
        print("[MQTT] Error while setting frontpanel led", e)
    elif msg.topic == self.topic+"/coin/led":
      try:
        self.coinSetLed(int(payload))
      except Exception as e:
        print("[MQTT] Error while setting coin led", e)
    elif msg.topic == self.topic+"/coin/state":
      try:
        self.coinSetState(int(payload))
      except Exception as e:
        print("[MQTT] Error while setting coin state", e)
    else:
      print("[MQTT] Topic not handled",msg.topic, payload)

  def on_subscribe(self, mosq, obj, mid, granted_qos):
    pass

  def on_connect(self, mosq, userdata, flags, rc):
    if (rc==0):
      mosq.subscribe(self.topic+"/vend", 0)
      mosq.subscribe(self.topic+"/nudge", 0)
      mosq.subscribe(self.topic+"/frontpanel/led", 0)
      mosq.subscribe(self.topic+"/coin/led", 0)
      mosq.subscribe(self.topic+"/coin/state", 0)
      mosq.subscribe(self.topic+"/ibutton/led", 0)
    else:
      print("Fatal error: Could not connect to the MQTT server. (rc="+str(rc)+")")
      sys.exit(1)

  def on_button(self, buttons):
    print("[BUTTONS] "+str(buttons))
    self.mqttc.publish(self.topic+"/frontpanel/buttons", payload=str(buttons), qos=0, retain=False)
    a = (buttons>>0)&1
    b = (buttons>>1)&1
    c = (buttons>>2)&1
    d = (buttons>>3)&1
    e = (buttons>>4)&1
    #self.fpLed(buttons)
    if a+b+c+d > 1:
      print("Multiple buttons pressed, ignore!")
    elif a:
      print("Button 1 pressed!")
      #self.vend("11")
    elif b:
      print("Button 2 pressed!")
      #self.vend("12")
    elif c:
      print("Button 3 pressed!")
      #self.vend("13")
    elif d:
      print("Button 4 pressed!")
      #self.vend("14")
    elif e:
      print("Button 5 pressed!")
      #self.vend("15")

  def on_coin(self, coin):
    print("[COIN] "+str(coin))
    self.mqttc.publish(self.topic+"/coin", payload=str(coin), qos=0, retain=False)

  def on_empty(self, empty):
    print("[EMPTY] "+str(empty))
    self.fpLed(empty)

  def debugPrint(self, message):
    print("[DEBUG]",message)
    self.mqttc.publish(self.topic+"/debug", payload=message, qos=0, retain=False)

  def on_init(self, server, port, dev=False):
    self.server = server
    self.port = port
    self.dev = dev
    
    self.mqttc = paho.Client()
    self.mqttc.on_message = self.on_message
    self.mqttc.on_connect = self.on_connect
    self.mqttc.on_subscribe = self.on_subscribe
    print("[MQTT] Connecting to MQTT server ("+self.server+":"+str(self.port)+")...")
    self.mqttc.connect(self.server, self.port, 60)
    self.mqttc.loop_start()

    #sys.excepthook = self.handle_exception
        
    self._running = True
    self._deviceManager = hardware.DeviceManager(self.debugPrint, self.halt, self.sleep, self.on_state, self.on_key, self.on_button, self.on_empty, self.on_coin)
    self._drawers = self._deviceManager.getDrawers()
    self._onewire = self._deviceManager.getOnewire()
    self._frontpanel = self._deviceManager.getFrontpanel()
    self._coin = self._deviceManager.getCoin()

    if not dev:
      if (len(self._drawers)!=1):
        print("Could not find the vending unit!")
        sys.exit(1)
      if (len(self._frontpanel)!=1):
        print("Could not find the frontpanel!")
        sys.exit(1)
      if (len(self._coin)!=1):
        print("Could not find the coin validator!")
        sys.exit(1)
      #if (len(self._onewire)!=1):
      #  print("Could not find the iButton reader!")
      #  sys.exit(1)
      
      self._deviceManager.cbEnable()
    
  def on_loop(self):
    if not self._deviceManager is None:
      self._deviceManager.update()

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
      if (len(location)!=2) or (unit<0) or (unit>5) or (pos<0) or (unit>=len(self._drawers)):
        print("[VEND] Error! "+str(unit)+" > "+str(pos))
        return False
      if nudge:
        self._drawers[unit].nudge(pos)
        print("[NUDGE] "+str(unit)+" > "+str(pos))
      else:
        self._drawers[unit].dispense(pos)
        print("[DISPENSE] "+str(unit)+" > "+str(pos))
    except Exception as e:
      print(e)
   
  def fpLed(self, val):
    if len(self._frontpanel) > 0:
      print("(("+str(val)+"))")
      self._frontpanel[0].frontpanelSetLedBits(val)
   
  def coinSetLed(self, val):
    if len(self._coin) > 0:
      self._coin[0].coinSetLed(val)

  def coinSetState(self, val):
    if len(self._coin) > 0:
      self._coin[0].coinSetState(val)

  def on_cleanup(self):
    pass
    
  def on_execute(self, server, port, dev=False):
    if self.on_init(server, port, dev) == False:
      self._running = False

    while( self._running ):
      self.on_loop()
    self.on_cleanup()

  def showPos(self):
    for i in range(0,len(self._drawers)):
      self._drawers[i].setAllLeds(0,0,0)
      self._drawers[i].setLed(drawers[i].getPosition(),255,0,0,0)
      self._drawers[i].updateLeds()
        
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
    if len(sys.argv) > 1:
      dev = int(sys.argv[1])&0x01
    if dev:
      print("Development mode enabled!")

    server = "10.42.1.2"
    port = 1883

    app.on_execute(server, port, dev)
