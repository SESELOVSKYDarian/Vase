FROM node:22-alpine AS runner
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/vase-management ./apps/vase-management
RUN npm install
RUN npm run build --workspace @vase/management
EXPOSE 3006
CMD ["npm", "run", "start", "--workspace", "@vase/management"]
