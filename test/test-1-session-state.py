from protocol import RpcClient, ApiError

client = RpcClient()

try:
	result = client.request("session/create")
except BaseException as e:
	exit(1)

client.token(result)


try:
	result = client.request("user/authenticate", {"username": "test", "password": "test"})
except BaseException as e:
	print(e)
	exit(1)

try:
	result = client.request("session/state")
except BaseException as e:
	print(e)
	exit(1)
	
print(result)
