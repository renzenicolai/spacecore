FROM node:22

RUN apt update && apt install -y mariadb-client

WORKDIR /app

COPY ./package.json /app
COPY ./package-lock.json /app
RUN cd /app && npm i


COPY . /app

ENTRYPOINT /app/docker/entrypoint.sh


