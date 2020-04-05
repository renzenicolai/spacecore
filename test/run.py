from os import listdir
import subprocess

files = listdir(".")
files.sort()

for f in files:
	if f.startswith("test") and f.endswith(".py"):
		process = subprocess.Popen("python "+f, shell=True, stdout=subprocess.PIPE)
		process.wait()
		longName = f+" "*(80-len(f))
		print(longName, end="")
		if process.returncode == 0:
			print(" [PASS]")
		else:
			print(" [FAIL]")
			exit(1)
