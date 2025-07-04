# Usa una base super-leggera con npm
FROM node:18-alpine                 

# 1) cartella di lavoro
WORKDIR /app                        

# 2) copia package* e installa dipendenze
COPY package*.json ./
RUN npm ci                          # più veloce di “npm install”

# 3) copia TUTTO il progetto
COPY . .

# 4) **BUILD** statico → ./dist
RUN npm run build                   # <-- vite build

# 5) installa server statico minimale
RUN npm install -g serve

# 6) Cloud Run ascolta su 8080
EXPOSE 8080

# 7) serviamo **solo** /dist
CMD ["serve", "-s", "dist", "-l", "8080"]
