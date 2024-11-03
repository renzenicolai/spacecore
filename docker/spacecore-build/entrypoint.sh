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
    mysql <schema.sql || exit 1

    echo "Create initial admin user"
    CRYPTED_PASS=$(mkpasswd -m sha-512 "$ADMIN_PASSWORD")
    echo "INSERT INTO users (id, user_name, full_name, title, password, active, avatar_id) VALUES (NULL, 'admin', 'admin', 'bofh', '$CRYPTED_PASS', '1', NULL);" | mysql db

fi

echo "Starting app.js..."
exec node app.js --config=""
