FROM node:22-alpine AS runner
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/vase-portal ./apps/vase-portal
RUN npm install
RUN npm run build --workspace @vase/portal
EXPOSE 3001
CMD ["npm", "run", "start", "--workspace", "@vase/portal"]
