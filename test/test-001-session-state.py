from protocol import RpcClient, ApiError

client = RpcClient()

try:
	result = client.request("session/create")
except BaseException as e:
	print("FAIL exception", e)
	exit(1)

client.token(result)

try:
	result = client.request("user/authenticate", {"user_name": "test"})
except BaseException as e:
	print("FAIL result authenticate:", e)
	exit(1)

try:
	result = client.request("session/state")
except BaseException as e:
	print("FAIL result state:", e)
	exit(1)
	
print("PASS", result)
