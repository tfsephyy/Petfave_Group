FROM node:24-alpine
WORKDIR /workspace/Front

RUN mkdir -p /workspace/Group-System/public \
    && chown -R node:node /workspace
USER node

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci
COPY --chown=node:node . ./
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
