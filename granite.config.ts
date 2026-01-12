import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'chess-grow',
  brand: {
    displayName: '체스 키우기',
    primaryColor: '#4A90D9',
    icon: 'https://static.toss.im/appsintoss/73/1414e0f9-f3eb-4b56-a138-e3351502738d.png', // 임시 아이콘 (나중에 교체 필요)
    bridgeColorMode: 'basic',
  },
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'vite --host',
      build: 'tsc -b && vite build',
    },
  },
  permissions: [],
  outdir: 'dist',
  webViewProps: {
    type: 'game',
    overScrollMode: 'never',
  },
});
