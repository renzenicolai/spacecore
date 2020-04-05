from protocol import RpcClient, ApiError

client = RpcClient()

# Preparation

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

# Tests

userId = -1
try:
	userId = client.request("user/create", {
		"user_name":"testuser123",
		"password": "testpassword123",
		"active":True,
		"full_name":"Just a test",
		"title":"A",
		"permissions": [
			"testA",
			"testB",
			"testC"
		]
	})
		
	print("user created:", userId)
except BaseException as e:
	print("failed to create user:", e)
	exit(1)

try:
	result = client.request("user/list")
	matched = False
	for i in result:
		if (i["user_name"] == "testuser123"):
			print(i)
			matched = True
			if i["id"] != userId:
				raise Exception("Got back wrong id.")
	if not matched:
		raise Exception("Created user not found")
except BaseException as e:
	print("failed to list users:", e)
	exit(1)

try:
	result = client.request("user/edit", {"id": userId, "title":"B", "permissions": ["testB","testC","testD"]})
except BaseException as e:
	print("failed to edit user:", e)
	exit(1)

try:
	result = client.request("user/list")
	matched = False
	for i in result:
		if (i["user_name"] == "testuser123"):
			print(i)
			matched = True
			if i["id"] != userId:
				raise Exception("Got back wrong id.")
	if not matched:
		raise Exception("Created user not found")
except BaseException as e:
	print("failed to list users:", e)
	exit(1)

try:
	result = client.request("user/remove", userId)
except BaseException as e:
	print("failed to remove user:", e)
	exit(1)

print("PASS")
