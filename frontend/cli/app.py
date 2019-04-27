import readline, cmd, sys, time, datetime, pprint, term

from protocol import RpcClient, ApiError

try:
  from printer import ReceiptPrinter
except:
  print("No printer support available!")

class Shell(cmd.Cmd):
	def do_test(self, arg):
		print("Test", arg)
	
	def do_help(self, arg):
		help()
	
	def default(self, line):
		if line == "EOF":
			header()
			print("Goodbye!")
			time.sleep(1)
			term.clear()
			sys.exit()
		#header()
		#print("\nUnknown command.\n")
		main2(line)
		setPrompt()
	
	def completedefault(self, *args):
		self.completenames(*args)
	
	def completenames(self, text, line, begidx, endidx):
		#print("Complete",text,line,begidx,endidx)
		query = readline.get_line_buffer().lstrip().lower()
		results = []
		#print("Complete",text, query)
		for product in clProducts:
			if product.startswith(text):
				results.append(product)
		for persons in clPersons:
			if persons.startswith(text):
				results.append(persons)
		#print(results)
		if len(results)>0:
			return results
		return []
	
	def emptyline(self):
		usage()

def halt(message, error=None):
	term.clear()
	term.header("Error")
	print(message)
	if error:
		print("--------------------------")
		print(error)
	time.sleep(5)
	sys.exit(1)

def warning(message):
	term.clear()
	term.header("Warning")
	print(message)
	#time.sleep(2)

def confirmation(success, message):
	term.color(40,92,5)
	print(message)
	term.color(0)
	term.color()

def header():
	term.clear()
	term.header("TkkrLab barsystem", 103,30,1)
	print("")

def usage():
	header()
	printCart(client)
	global cart
	if len(cart) > 0:
		print("Enter your name to buy the products in the cart.")
		print("Enter the name of (/ scan) a product to add it to the cart.")
		print("Enter 'abort' to clear the cart.")
		print("Enter 'help' for a list of commands.")
		print("")
	else:
		print("Enter your name to display information about your account.")
		print("Enter the name of (/ scan) a product to add it to the cart.")
		print("Enter 'help' for a list of commands.")
		print("")

def setPrompt():
	if len(cart) < 1:
		shell.prompt = "Command, user (query info) or product (add to cart)? > "
	else:
		shell.prompt = "Command, user (buy products) or product (add to cart)? > "

def main():
	global client, shell
	
	# Load the configuration from files (to-do: replace with proper configuration file)
	
	hostFile = open('spacecore-cli.uri', 'r')
	uri = hostFile.read()
	hostFile.close()

	pwFile = open('spacecore-cli.pw', 'r')
	password = pwFile.read()
	pwFile.close()

	client = RpcClient(uri)
	
	if not client.createSession():
		halt("Communication error", "Could not start the session!")

	if not client.login("barsystem", password):
		halt("Communication error", "Could not authenticate!")
	
	global printer
	try:
		printer = ReceiptPrinter("/dev/ttyUSB0")
	except:
		printer = None
		warning("Printer not available!")
	
	initCompletion()	
	shell = Shell()
	setPrompt()
	header()
	shell.cmdloop()

pp = pprint.PrettyPrinter(indent=4)

cart = {}
lastCmd = ''
lastPerson = None
lastProduct = None
cmd_params = []
development = False
lastTransaction = []
lastTransactionTotal = []

def initCompletion():
	global clProducts, clPersons
	clProducts = []
	clPersons = []
	header()
	print("Please wait, querying list of products...")
	products = client.productList({})
	for product in products:
		clProducts.append(product["name"].lower())
	persons = client.personList({})
	print("Please wait, querying list of persons...")
	for person in persons:
		clPersons.append(person["nick_name"].lower())

def abort():
	global cart
	cart = {}
	sys.stdout.write("\r\n\u001b[31mTransaction canceled!\u001b[39m\r\n\r\n")

def product(client, name):
	global cart, lastProduct
	results = client.productFindByBarcode(name) + client.productFindByNameLike(name)
	if len(results) > 0:
		if len(results) > 1:
			#sys.stdout.write("\r\n\u001b[31mError: multiple results for query!\u001b[39m\r\n\r\n")
			#return True

			sys.stdout.write("\r\n\u001b[33m=== MULTIPLE RESULTS ===\u001b[39m\r\n\r\n")
			for i in range(0,len(results)):
				product = results[i]
				#mbr_pr = str(round(float(product['member_price']),2))
				#std_pr = str(round(float(product['standard_price']),2))
				print(str(i+1)+". "+'{0: <25}'.format(product['name']))#+'{0: <6}'.format("€ "+mbr_pr)+" / "+'{0: <6}'.format("€ "+std_pr))
			try:
				choice = int(prompt(client, "\r\nPick one (or abort):"))-1
				if (choice >= 0) and (choice < len(results)):
					result = results[choice]
				else:
					print("\u001b[31mCanceled\u001b[39m")
					return True
			except:
				print("\u001b[31mCanceled\u001b[39m")
				return True

		else:
			result = results[0]

		lastProduct = result
		
		productsToCart(client, [result])
		
		usage()
		
		print("\u001b[32mAdded\u001b[39m "+result['name']+"\u001b[32m to your cart.\u001b[39m")
				
		return True

	return False

def executeTransaction(client, person):
	global cart
		
	product_rows = []
	
	for cartRow in cart:
		data = {"id": cart[cartRow]["product"]["id"], "amount": cart[cartRow]["amount"]}
		if ("stock" in cart[cartRow]):
			data["stock"] = cart[cartRow]["stock"]["id"]
			#print("STOCK IN TRANSACTION")
		product_rows.append(data)
	
	transaction = client.transactionExecute(
		person["id"],
		product_rows,
		[]
	)

	cart = {}
	
	#sys.stdout.write("\r\n\u001b[31m"+message+"\u001b[39m\r\n")

	header()
	confirmation(True, "Transaction completed!")

	printTransaction(transaction)


def printTransaction(transaction, neg=False):
	global lastPerson, lastTransaction, lastTransactionTotal
	
	lastTransaction = []
	
	if neg:
		neg = -1
	else:
		neg = 1
	
	print("\r\n=== TRANSACTION RECEIPT ===")
	for row in transaction["rows"]:
		print(str(row["amount"])+"x "+'{0: <29}'.format(row["description"])+'{0: <6}'.format("€ "+str(neg*round(row["price"]*row["amount"]/100.0,2))))
		lastTransaction.append((row["description"], row["amount"], neg*round(row["price"]*row["amount"]/100.0,2)))

	print("\r\nTransaction total:\t\t€ "+'{0: <6}'.format("{:.2f}".format(transaction['transaction']['total']/100.0)))
	print("Saldo before transaction:\t€ "+'{0: <6}'.format("{:.2f}".format(lastPerson['saldo']/100.0)))
	print("Saldo after transaction:\t€ "+'{0: <6}'.format("{:.2f}".format(transaction['person']['saldo']/100.0)))
	lastTransactionTotal = [
		("Total",transaction['transaction']['total']/100.0),
		("Saldo before transaction",lastPerson['saldo']/100.0),
		("Saldo after transaction",transaction['person']['saldo']/100.0)
		]
	
	global printer
	if printer != None:
		print("\n")
		print("Use 'print' to print this receipt.")
	print("")

	
def person(client, name, doTransaction=True):
	global cart, lastPerson
	results = client.personFind(name)
	if (len(results) > 0):
		if (len(results) > 1):
			sys.stdout.write("\r\n\u001b[31mError: multiple persons with same nickname!\u001b[39m\r\n\r\n")
			return True

		person = results[0]
		
		lastPerson = person
		
		if (len(cart)<1):
			print("Full name:\t"+person['first_name']+" "+person['last_name'])
			print("Saldo:\t\t"+'{0: <6}'.format("€ "+"{:.2f}".format(person['saldo']/100.0)))
			print("Groups:\t\t", end="")
			for group in person['groups']:
				print(group["name"]+" ",end="")
			print("")
		elif doTransaction:
			executeTransaction(client, person)
		return True
	return False

def productsToCart(client, products):
	global cart
	for i in products:
		product_id = i["id"]
		if not product_id in cart:
			cart[product_id] = {"product": i, "amount": 1}
			stockToCart(client, product_id, i['stock'])
		else:
			item = cart[product_id]
			item["amount"]+=1
			cart[product_id] = item

def stockToCart(client, product, stock):
	global cart
	if not product in cart:
		print("Warning: product not in cart.")
	else:
		if len(stock) > 0:
			if (len(stock)<2):
				cart[product]["stock"] = stock[0]
				print("Taking stock from '"+str(stock[0]["id"])+"' ("+str(stock[0]["amount_current"])+")")
			else:
				oldestStock = stock[0]
				for stockRecord in stock:
					if stockRecord["timestamp_initial"] < oldestStock["timestamp_initial"]:
						oldestStock = stockRecord
				cart[product]["stock"] = oldestStock
				print("Taking stock from '"+str(oldestStock["id"])+"' ("+str(oldestStock["amount_current"])+")")
		else:
			print("Warning: product is out of stock!")

def printCart(client):
	global cart
	if len(cart) > 0:
		print("\r\n=== CART ========================================\r\n")
		for i in cart:
			product = cart[i]["product"]
			amount = cart[i]["amount"]
			print(str(amount)+"x "+'{0: <25}'.format(product['name']),end="")
			print("\t", end="")
			groups = client.getGroups()
			for i in range(len(groups)):
				group = groups[i]
				last = i < (len(groups) - 1)
				if last:
					last = " / "
				else:
					last = ""
				price = False
				for entry in product['price']:
					if entry['person_group_id'] == group['id']:
						price = entry['amount']
				if price:
					price = "€ "+(str(price/100.0))
				else:
					price = "-"
				print(group['name']+": "+'{0: <6}'.format(price)+last,end="")
			print("\r\n")
		print("=================================================\r\n\r\n")

# Shell helper functions

def queryLocation(client):
	locations = client.getLocations()
	for i in range(len(locations)):
		sub = ""
		if locations[i]["sub"]:
			sub = "(Position "+str(locations[i]["sub"])+")"
		print(str(i)+". "+locations[i]['name']+" "+sub)
	
	location = prompt(client, "Where? > ",False,False)
	try:
		location = int(location)
		location = locations[location]["id"]
		return location
	except:
		print("Invalid input.")
		return -1
		
def queryStock(client, product_id):
	stockEntries = client.getStock(product_id)
	for i in range(len(stockEntries)):
		sub = ""
		if stockEntries[i]['product_location']["sub"]:
			sub = " (Position "+str(stockEntries[i]['product_location']["sub"])+")"
		print(str(i)+". "+str(stockEntries[i]['product_location']['name'])+sub+": "+str(stockEntries[i]["amount_current"]))
	
	stock = prompt(client, "Row? > ",False,False)
	try:
		stock = int(stock)
		return (stockEntries[stock]["id"], stockEntries[stock]["amount_current"])
	except:
		print("Invalid input.")
		return (-1, 0)
	
def queryGroup(client):
	groups = client.getGroups()
	for group in groups:
		print(str(group["id"])+". "+group["name"])
	group_id = prompt(client, "Group? > ",False,False)
	try:
		group_id = int(group_id)
		for group in groups:
			if (group_id == group["id"]):
				return group_id
	except:
		print("Invalid input.")
	return None
	
def liststock(client):
	if lastProduct:
		print("List stock of "+lastProduct['name']+".")
		stockEntries = client.getStock(lastProduct["id"])
		for i in range(len(stockEntries)):
			sub = ""
			if stockEntries[i]['product_location']["sub"]:
				sub = " (Position "+str(stockEntries[i]['product_location']["sub"])+")"
			print(str(i)+". "+str(stockEntries[i]['product_location']['name'])+sub+": "+str(stockEntries[i]["amount_current"]))
	else:
		print("No product.")
	

def addstock(client):
	global lastProduct, cmd_params, cart
	if lastProduct:
		print("Adding stock to "+lastProduct['name']+".")
		amount = prompt(client, "How many? > ",False,False)
		if len(amount) < 1:
			print("Stop.")
			return
		try:
			amount = int(amount)
		except:
			print("Not a number.")
			return
		location = queryLocation(client)
		if (location < 0):
			print("Stop.")
			return
		print("Adding "+str(amount)+" items to stock of product "+str(lastProduct['id'])+" at location "+str(location))
		client.addStock(lastProduct['id'], location, amount)
		cart = {}
	else:
		print("No product.")
		
def removestock(client):
	global lastProduct, cmd_params, cart
	if lastProduct:
		print("Remove stock of "+lastProduct['name']+".")
		(stock_id, max_amount) = queryStock(client, lastProduct["id"])
		if (stock_id < 0):
			print("Stop.")
			return
		amount = prompt(client, "How many? (0-"+str(max_amount)+") > ",False,False)
		if len(amount) < 1:
			print("Stop.")
			return
		try:
			amount = int(amount)
		except:
			print("Not a number.")
			return
		if (amount > max_amount) or (amount < 0):
			print("Out of range.")
			return
		print("Removing "+str(amount)+" items from stock  "+str(stock_id))
		client.removeStock(stock_id, amount)
		cart = {}
	else:
		print("No product.")
		
def setprice(client):
	global lastProduct, cmd_params, cart
	if lastProduct:
		print("Set price of of "+lastProduct['name']+".")
		group = queryGroup(client)
		if (group == None):
			print("Invalid input.")
			return
		price = queryPrice(client, "Price")
		if (price == None):
			print("Invalid input.")
			return
		print("Setting price of "+str(lastProduct["id"])+" to "+str(price)+" for group "+str(group))
		client.productSetPrice(lastProduct["id"], group, price)
		cart = {}
	else:
		print("No product.")
		
def listgroups(client):
	groups = client.getGroups()
	for group in groups:
		print(str(group["id"])+". "+group["name"])
		
def lasttransactions(client):
	lastTransactions = client.lastTransactions(5)
	for transaction in lastTransactions:
		print("------")
		pp.pprint(transaction)
	print("------")
	
def addperson(client):
	if (len(cmd_params) > 0):
		name = cmd_params[0]
	else:
		name = prompt(client, "What is your name? >",False,False)
	print(client.addPerson(name))

def help():
	print("")
	print("\u001b[103m\u001b[30m  ~~~  Welcome to the Tkkrlab barsystem  ~~~  \u001b[49m\u001b[39m")
	print("")
	print(" - add        Create an account")
	print(" - deposit    Add money to your account")
	print(" - clear      Clear screen")
	print(" - abort      Abort transaction")
	print(" - help       This text")
	print("")

def command(client, user_input):
	global lastCmd, cmd_params
	cmd = user_input
	cmd_params = []
	user_input = user_input.split(" ");
		
	if (len(user_input) > 1):
		cmd = user_input[0]
		cmd_params = user_input[1:]
			
	lastCmd = cmd
	if (cmd=="deposit"):
		deposit(client)
		return True
	elif (cmd=="amount"):
		setAmount(client)
		return True
	elif (cmd=="remove"):
		cmd_params = ["0"]
		setAmount(client)
		return True
	elif cmd == "print":
		printReceipt()
		return True
	elif (cmd=="sudo"):
		if (len(cmd_params) < 1):
			return False
		if cmd_params[0] == "addstock":
			addstock(client)
			return True
		if cmd_params[0] == "liststock":
			liststock(client)
			return True
		if cmd_params[0] == "removestock":
			removestock(client)
			return True
		if cmd_params[0] == "listgroups":
			listgroups(client)
			return True
		if cmd_params[0] == "log":
			lasttransactions(client)
			return True
		if cmd_params[0] == "setprice":
			setprice(client)
			return True
		return False
	elif (cmd=="register"):
		addperson(client)
		return True
	elif (cmd=="cls") or (cmd=="clear"):
		clear()
		return True
	elif (cmd=="abort"):
		abort()
		return True
	elif (cmd=="help"):
		help()
		return True
	elif (cmd=="cyber"):
		print("\u001b[103m\u001b[30m         \u001b[49m\u001b[39m")
		print("\u001b[103m\u001b[30m  CYBER  \u001b[49m\u001b[39m")
		print("\u001b[103m\u001b[30m         \u001b[49m\u001b[39m")
		return True
	#print("? '"+cmd+"'")
	lastCmd = ''
	return False

def queryPrice(client, text="Amount"):
	amount = prompt(client, text+" > €",False,False)
	if len(amount) < 1:
		return
	try:
		amount = int(float(amount)*100)
	except:
		print("Not a number.")
		return None
	return amount

def deposit(client):
	def usage():
		print("deposit <amount in €> <name of person>")
		
	if (len(cmd_params) == 2):
		try:
			amount = int(float(cmd_params[0])*100)
			name = cmd_params[1]
		except:
			usage()
			return
	elif (len(cmd_params) != 0):
		usage()
		return
	else:
		amount = queryPrice(client)
		if (amount == None):
			print("Invalid input.")
			return
		name = prompt(client, "Person > ",False,False)
	
	if not person(client, name, False):
		print("Unknown person.")
		return
	
	global lastPerson
	

	transaction = client.transactionExecute(
		lastPerson["id"],
		[],
		[{"description":"Deposit", "price":-amount, "amount":1}]
	)
	
	header()
	confirmation(True, "Deposit completed!")
	printTransaction(transaction, True)
	
def setAmount(client):
	global cart, lastProduct
	if lastProduct:
		if (len(cmd_params) == 1):
			amount = cmd_params[0]
		elif (len(cmd_params) != 0):
			print("Usage: amount <number>")
			return
		else:
			amount = prompt(client, "Amount of "+lastProduct["name"]+" >")
		try:
			amount = int(amount)
		except:
			print("Not a number.")
			return
		for cartRow in cart:
			if (cart[cartRow]["product"]["id"] == lastProduct["id"]):
				if (amount == 0):
					cart.pop(cartRow)
					print("Removed "+lastProduct["name"]+" from the cart")
				else:
					cart[cartRow]["amount"] = amount
					print("Changed amount of "+lastProduct["name"]+" to "+str(amount))
				return
		if (amount != 0):
			productsToCart(client, [lastProduct])
			print("Added "+lastProduct["name"]+" to the cart")
			for cartRow in cart:
				if (cart[cartRow]["product"]["id"] == lastProduct["id"]):
					cart[cartRow]["amount"] = amount
					return
	else:
		print("Add a product to the cart first.")
	
def clear():
	sys.stdout.write("\033c")

def prompt(client, prompt=">",header=False, headerCart=False, history=False):
	if (header):
		#clear()
		sys.stdout.write("\r\n\u001b[33mTkkrlab\u001b[39m barsystem\r\n")

	if (headerCart):
		if len(cart) > 0:
			printCart(client)
		print("")

	sys.stdout.write("\u001b[36m"+prompt+"\u001b[39m ")
	sys.stdout.flush()
	buffer = ""
	last = ""
	buffer = sys.stdin.readline()
	i = buffer.replace("\r","").replace("\n","")
	print("")
	sys.stdout.flush()
	return i

def printReceipt():
	global printer, lastPerson, lastTransaction, lastTransactionTotal
	
	if printer == None:
		print("No printer available.")
		return
	
	if len(lastTransaction) < 1:
		print("No transaction available.")
		return
	
	print("Please wait...")
	
	customer_name = lastPerson['nick_name']
	if (len(lastPerson['first_name'])+len(lastPerson['last_name'])) > 0:
		customer_name = lastPerson['first_name']+" "+lastPerson['last_name']
	
	printer.init()
	printer.set_code_table('cp858')
	printer.print_image('tkkrlab.bmp')
	printer.feed(1)
	printer.set_align(printer.ALIGN_CENTER)
	printer.set_print_mode(printer.PRINTMODE_FONT_A)
	printer.writeline('*** TkkrLab Barsystem ***')
	printer.feed(1)
	printer.set_align(printer.ALIGN_LEFT)
	printer.writeline('Customer {}'.format(customer_name))
	printer.writeline('Date     {}'.format(time.strftime('%Y-%m-%d %H:%M:%S')))
	printer.feed(2)

	printer.set_align(printer.ALIGN_LEFT)
	printer.set_print_mode(printer.PRINTMODE_FONT_B)

	# products
	for name, amount, cost in lastTransaction:
		printer.write_product_line(name, cost, amount)

	printer.set_print_mode(printer.PRINTMODE_FONT_A)
	printer.writeline('-' * 42)
	printer.set_print_mode(printer.PRINTMODE_FONT_B | printer.PRINTMODE_EMPHASIZED | printer.PRINTMODE_DOUBLE_HEIGHT)
	first = True
	for name, cost in lastTransactionTotal:
		printer.write_product_line(name, cost)
		if first:
			first = False
			printer.set_print_mode(printer.PRINTMODE_FONT_B | printer.PRINTMODE_EMPHASIZED)
			printer.feed(1)
	printer.set_print_mode(printer.PRINTMODE_FONT_A)

	printer.feed(6)
	printer.cut(0)

# Main function

def main2(line):
	try:
		while not client.ping():
			print("Server unavailable. Reconnecting in 2 seconds...")
			time.sleep(2)

		i = line #prompt(client, p, showHeader, True)
		showHeader = True

		if (len(i)>0):
			if not command(client, i):
				if not person(client, i):
					if not product(client, i):
						print("\u001b[31mError: unknown command, user or product.\u001b[39m")
						showHeader = False
					else:
						showHeader = False
				else:
					showHeader = False
			else:
				if ((lastCmd == 'clear') or (lastCmd == 'cls')):
					showHeader = True
				else:
					showHeader = False
	except ApiError as e:
		print("\u001b[31mServer error:",e,"\u001b[39m")

if __name__ == '__main__':
	main()
