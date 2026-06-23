FROM node:22-alpine AS runner
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/vase-help ./apps/vase-help
RUN npm install
RUN npm run build --workspace @vase/help
EXPOSE 3004
CMD ["npm", "run", "start", "--workspace", "@vase/help"]
