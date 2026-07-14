FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# No API key is baked at build time. The STT key is injected into nginx at runtime
# (see below), so it never lands in an image layer or the client bundle.
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Use the nginx template mechanism: at container start the entrypoint runs envsubst
# on templates in /etc/nginx/templates and writes /etc/nginx/conf.d/default.conf,
# substituting ${XAI_API_KEY} from the container environment.
COPY nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
