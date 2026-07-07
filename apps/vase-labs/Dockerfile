FROM node:22-alpine AS runner
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/vase-labs ./apps/vase-labs
RUN npm install
RUN npm run prisma:generate --workspace @vase/labs
RUN npm run build --workspace @vase/labs
EXPOSE 3007
CMD ["npm", "run", "start", "--workspace", "@vase/labs"]
