import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
  testDir:'./e2e',
  timeout:30000,
  use:{baseURL:'http://127.0.0.1:5173',trace:'retain-on-failure',...devices['Desktop Chrome']},
  webServer:{command:'cd ../.. && npm run dev',url:'http://127.0.0.1:5173',reuseExistingServer:true,timeout:120000},
});
