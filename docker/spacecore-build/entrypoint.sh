#!/bin/bash

#get database setting from env and create my.cnf
echo """
[client]
user=$CONFIG_DATABASE_USER
password=$CONFIG_DATABASE_PASSWORD
host=$CONFIG_DATABASE_HOST
database=$CONFIG_DATABASE_NAME
""" >/etc/my.cnf

# wait for db
while ! mysql &>/dev/null; do
    echo "Waiting for db..."
    sleep 1
done

# init db?
if ! mysqldump db users >/dev/null; then
    echo "Init db..."
    mysql <schema.sql
fi

echo "Starting app.js..."
exec node app.js --config=""
