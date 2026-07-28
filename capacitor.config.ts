import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.NEXT_PUBLIC_APP_URL || "https://vstrecha.smazka.ru";

const config: CapacitorConfig = {
  appId: "ru.vmpauto.guestreg",
  appName: "Регистрация гостей",
  webDir: "www",
  server: {
    // Приложение открывает сайт на сервере ispmanager (рядом с MariaDB).
    // Так все телефоны работают с одной БД одновременно.
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
  android: {
    allowMixedContent: true,
  },
  ios: {
    contentInset: "automatic",
    limitsNavigationsToAppBoundDomains: false,
  },
};

export default config;
