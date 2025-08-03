FROM  nginx

COPY docs/.vuepress/dist /app

# Override default nginx config
COPY /nginx.conf /etc/nginx/conf.d/default.conf

RUN rm -rf /usr/share/nginx/html \
  && ln -s /app /usr/share/nginx/html