FROM node:22-alpine AS runner
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/vase-business ./apps/vase-business
RUN npm install
RUN npm run build --workspace @vase/business
EXPOSE 3005
CMD ["npm", "run", "start", "--workspace", "@vase/business"]
