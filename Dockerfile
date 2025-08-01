FROM node:slim
# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

# If you are building your code for production
RUN npm ci --omit=dev

# Bundle app source
COPY dist/ .

EXPOSE 8080
CMD [ "node", "index.js" ]

# At the end, set the user to use when running this image
USER node