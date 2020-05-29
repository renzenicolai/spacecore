from protocol import RpcClient, ApiError

client = RpcClient()

try:
	result = client.request("session/create")
except BaseException as e:
	print("FAIL exception", e)
	exit(1)

if not len(result) == 36:
	print("FAIL result length", len(result))
	exit(1)

if not result[8] == "-":
	print("FAIL result format 1")
	exit(1)

if not result[13] == "-":
	print("FAIL result format 2")
	exit(1)

if not result[18] == "-":
	print("FAIL result format 3")
	exit(1)

if not result[23] == "-":
	print("FAIL result format 4")
	exit(1)

print("PASS result", result)
exit(0)
