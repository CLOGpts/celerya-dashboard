
# Usa un'immagine di Node
FROM node:18-alpine

# Crea una cartella di lavoro
WORKDIR /app

# Copia tutti i file dell'app (quelli creati da Google AI Studio)
COPY . .

# Installa il server statico 'serve'
RUN npm install -g serve

# Espone la porta 8080 per Cloud Run
EXPOSE 8080

# Comando di avvio: serve i file statici sulla porta 8080
CMD ["serve", "-s", ".", "-l", "8080"]
