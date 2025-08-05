import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.dfb1051768cf4b03acd32b433bbd2305',
  appName: 'your-symptom-buddy',
  webDir: 'dist',
  server: {
    url: 'https://dfb10517-68cf-4b03-acd3-2b433bbd2305.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    },
    Camera: {
      permissions: ["camera", "photos"]
    },
    Microphone: {
      permissions: ["microphone"]
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#2563eb",
      showSpinner: true,
      spinnerColor: "#ffffff"
    },
    StatusBar: {
      style: "default",
      backgroundColor: "#2563eb"
    }
  },
  ios: {
    scheme: "MDSDR",
    contentInset: "automatic"
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
      keystorePassword: undefined,
      keystoreAliasPassword: undefined,
      signingType: "jarsigner"
    }
  }
};

export default config;