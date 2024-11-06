FROM nginx:1.27-alpine



COPY default.conf /etc/nginx/conf.d
RUN apk add git && rm -rf /usr/share/nginx/html/*
RUN git clone https://github.com/renzenicolai/spacecore-frontend-web-admin.git /usr/share/nginx/html
