import requests, json, time

class ApiError(Exception):
	def __init__(self, error):
		if 'message' in error:
			message = error['message']
		else:
			message = error
		if 'code' in error:
			code = error['code']
		else:
			code = -1
		super().__init__(message)

class RpcClient:
	def __init__(self, uri="http://127.0.0.1:8000"):
		self._uri = uri
		self._session = None
		self.user = None
		
		self._username = ""
		self._password = ""

	def _request(self, method, params=None, retry=True):
		id = round(time.time())
		data = {"jsonrpc":"2.0", "id": id, "method": method, "params": params}
		if self._session != None:
			data["token"] = self._session
		request = requests.post(self._uri, json=data)
		data = json.loads(request.text)
		if (not 'id' in data) or (data['id']!=id):
			print("DEBUG",data)
			raise ApiError("API returned incorrect id!")
		if (data['jsonrpc']!="2.0"):
			raise ApiError("Invalid response")
		if 'error' in data:
			#print("ERROR", data['error'])
			if retry and data['error']['code'] == 1: #Access denied
				print("\u001b[33mSession interrupted. Connecting...\u001b[39m")
				self.createSession()
				self.login(self._username, self._password)
				return self._request(method, params, False)
			raise ApiError(data['error'])
		if 'result' in data:
			return data['result']
		return None

	# PING MODULE

	def ping(self):
		try:
			if self._request("ping", []) == "pong":
				return True
		except:
			pass
		return False

	# SESSIONS MODULE

	def createSession(self):
		try:
			self._session = self._request("session/create")
			return True
		except ApiError as e:
			print("Could not create session:",e)
			return False

	def login(self, username, password):
		self._username = username
		self._password = password
		try:
			self.user = self._request("user/authenticate", {"username": username, "password": password})
			return True
		except ApiError as e:
			print(e)
			return False

	# PERSONS MODULE

	def personList(self, search):
		return self._request("person/list", search)

	def personFind(self, search):
		return self._request("person/find", search)

	def personDetails(self, search):
		return self._request("person/details", [search])

	# PRODUCTS MODULE

	def productList(self, query):
		return self._request("product/list", query)

	def productFindByName(self, name):
		return self._request("product/find/name", name)

	def productFindByNameLike(self, name):
		return self._request("product/find/name/like", name)
	
	def productBarcode(self, barcode, type=None):
		if type == None:
			return self._request("product/barcode/list", barcode)
		else:
			return self._request("product/barcode/list", {"barcode": barcode, "type": type})
		
	def productBarcodeTypes(self):
		return self._request("product/barcode/type/list")
	
	def productLocation(self, location=None):
		return self._request("product/location/list", location)
	
	def productFindByBarcode(self, barcode, type=None):
		if type == None:
			return self._request("product/find/barcode", barcode)
		else:
			return self._request("product/find/barcode", {"barcode": barcode, "type": type})
		
	def productSetPrice(self, product, group, price):
		return self._request("product/price/set", {"product_id":product, "group_id":group, "amount":price})
	
	# TRANSACTIONS MODULE
	
	def transactions(self, person=None, after=None, before=None):
		query = {}
		if person != None:
			query['person_id'] = person
		if after != None and before != None:
			query['timestamp'] = {">=": after, "<=": before}
		elif after != None:
			query['timestamp'] = {">=": after}
		elif before != None:
			query['timestamp'] = {"<=": before}
		return self._request("transaction/list", query)
	
	def lastTransactions(self, amount):
		return self._request("transaction/list/last", amount)

	def lastTransactionsOfPerson(self, person, amount):
		return self._request("transaction/list/last", {"query": {'person_id': person}, "amount": amount})
	
	def addPerson(self, name):
		return self._request("person/add", name)
	
	def transactionExecuteProducts(self, person, products=[]):
		transaction = {"person_id": person, "products": products}
		print(transaction)
		return self._request("transaction/execute", transaction)
	
	def transactionExecuteCustom(self, person, other=[]):
		# Expects other to have the following format:
		# {"description:"...", "price":123, "amount":123}
		# where price is the unit price and amount is the amount of units
		transaction = {"person_id": person, "other": other}
		return self._request("transaction/execute", transaction)
	
	def transactionExecute(self, person, products=[], other=[]):
		transaction = {"person_id": person, "products": products, "other": other}
		return self._request("transaction/execute", transaction)
	
	def getLocations(self, query=None):
		return self._request("product/location", query)
	
	def addStock(self, product, location, amount):
		return self._request("product/stock/add", {"product_id": product, "location_id": location, "amount": amount})
	
	def getStock(self, product):
		return self._request("product/stock", {"product_id": product, "amount_current":{">":0}})
	
	def removeStock(self, stock_id, amount):
		return self._request("product/stock/remove", {"id": stock_id, "amount": amount})
	
	def getGroups(self, query=None):
		return self._request("person/group/list", query)
	
