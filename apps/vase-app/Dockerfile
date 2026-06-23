FROM node:22-alpine AS runner
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/vase-app ./apps/vase-app
RUN npm install
RUN npm run build --workspace @vase/app
EXPOSE 3002
CMD ["npm", "run", "start", "--workspace", "@vase/app"]
