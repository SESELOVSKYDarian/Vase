FROM node:22-alpine AS runner
WORKDIR /repo
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/vase-admin ./apps/vase-admin
RUN npm install
RUN npm run build --workspace @vase/admin
EXPOSE 3003
CMD ["npm", "run", "start", "--workspace", "@vase/admin"]
