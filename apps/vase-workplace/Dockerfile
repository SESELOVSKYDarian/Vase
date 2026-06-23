FROM node:22-alpine AS runner
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/vase-workplace ./apps/vase-workplace
RUN npm install
RUN npm run build --workspace @vase/workplace
EXPOSE 3008
CMD ["npm", "run", "start", "--workspace", "@vase/workplace"]
