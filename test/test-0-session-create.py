from protocol import RpcClient, ApiError

client = RpcClient()

try:
	result = client.request("session/create")
except BaseException as e:
	exit(1)

if not len(result) == 36:
	exit(1)

if not result[8] == "-":
	exit(1)

if not result[13] == "-":
	exit(1)

if not result[18] == "-":
	exit(1)

if not result[23] == "-":
	exit(1)

exit(0)
