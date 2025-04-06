FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Create directory for logs
RUN mkdir -p /logs && chmod 777 /logs

# Expose port
EXPOSE 8080

# Start the application
CMD ["node", "index.js"]