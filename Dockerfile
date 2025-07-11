# Usa una immagine Node minimale
FROM node:18-alpine

# Cartella di lavoro all’interno del container
WORKDIR /app

# Copia prima solo package.json + package-lock.json (se presente)
COPY package*.json ./

# Installa tutte le dipendenze (npm ci richiede il lockfile: usiamo npm install)
RUN npm install

# Copia il resto del progetto (sorgenti, vite.config, ecc.)
COPY . .

# Compila i file statici con Vite (finiranno in /app/dist)
RUN npm run build

# Installa il server statico ‘serve’ usato in runtime
RUN npm install -g serve

# Cloud Run espone la 8080
EXPOSE 8080

# Avvia il server statico su /app/dist
CMD ["npx", "serve", "-s", "dist", "-l", "8080"]
