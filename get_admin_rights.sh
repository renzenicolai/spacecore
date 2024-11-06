#!/bin/bash

curl http://localhost/api/methods|jq -r  .[]|xargs -n1 -i echo  "INSERT INTO user_permissions (user_id , endpoint) VALUES (1 , '{}');" 
