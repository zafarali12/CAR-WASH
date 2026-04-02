import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.carwash.app',
  appName: 'CarWash App',
  webDir: 'public',
  server: {
    url: 'https://car-wash-ivory.vercel.app',
    cleartext: true
  }
};

export default config;
