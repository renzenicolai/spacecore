import requests, time

try:
	import ujson as json
except:
	print("(Please install ujson! Falling back on the slow built in json library)")
	time.sleep(2)
	import json

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

	def request(self, method, params=None):
		id = round(time.time())
		data = {"jsonrpc":"2.0", "id": id, "method": method, "params": params}
		if self._session != None:
			data["token"] = self._session
		request = requests.post(self._uri, json=data)
		data = json.loads(request.text)
		if (not 'id' in data) or (data['id']!=id):
			raise ApiError("Server returned invalid id")
		if (data['jsonrpc']!="2.0"):
			raise ApiError("Invalid response")
		if 'error' in data:
			raise ApiError(data['error'])
		if 'result' in data:
			return data['result']
		return None
	
	def token(self, token):
		self._session = token
