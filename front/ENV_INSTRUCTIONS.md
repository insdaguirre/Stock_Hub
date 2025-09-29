# Frontend Environment for Production Build

Set this variable before building:

REACT_APP_API_BASE_URL=https://web-production-b6d2.up.railway.app/api

Two options:
1) One-off in shell
   
   export REACT_APP_API_BASE_URL=https://web-production-b6d2.up.railway.app/api
   npm run build
   npm run deploy

2) Local .env.production file (untracked)
   
   Create a file named `.env.production` in `front/` with the line above, then:
   
   npm run build
   npm run deploy
