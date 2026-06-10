module.exports = {
  apps: [
    {
      name: "signmeeting",
      script: ".next/standalone/server.js",
      cwd: "/var/www/apps/signmeeting",
      env: {
        NODE_ENV: "production",
        PORT: "3009",
        HOSTNAME: "127.0.0.1",
        NEXT_PUBLIC_BASE_PATH: "/signmeeting",
        DATABASE_URL: "file:/var/lib/2startup/signmeeting/signmeeting.db",
        SIGNMEETING_UPLOAD_DIR: "/var/lib/2startup/signmeeting/uploads",
      },
    },
  ],
};
