# @bhairava/customer-mobile

Expo + SecureStore. Set `EXPO_PUBLIC_API_URL` to your API.

## Expo web (single React)

Root `package.json` pins React to Expo 53's `19.0.0` (`dependencies` + `overrides`). Metro aliases in `metro.config.js` force one copy of `react` / `react-dom` / `react-native` / `scheduler`. After install there must be **no** `apps/customer-mobile/node_modules/react`.

```bash
# from repo root
npm install
# hygiene if nested react reappears:
#   rm -rf apps/agent-mobile/node_modules/react apps/customer-mobile/node_modules/react
npm start -w @bhairava/customer-mobile -- --web --port 8082
```

Login screen should render without `Invalid hook call` / `Cannot read properties of null (reading 'useState')`.

