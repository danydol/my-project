FROM nginx:latest

COPY index.html /usr/share/nginx/html
COPY linux.png /usr/share/nginx/html

entrypoint 3000 	

CMD ["nginx", "-g", "daemon off;"]
