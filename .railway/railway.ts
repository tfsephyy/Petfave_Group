import { defineRailway, mysql, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const MySQL = mysql("MySQL", { image: "mysql:8", region: "iad" });
  MySQL.deploy = {
    multiRegionConfig: { iad: { numReplicas: 1 } },
    startCommand:
      "docker-entrypoint.sh mysqld --innodb-use-native-aio=0 --disable-log-bin --performance_schema=0 --innodb-buffer-pool-size=1G",
  };
  MySQL.networking = { privateNetworkEndpoint: "mysql" };
  const petfaveWebVolume = volume("petfave-web-volume", {
    alerts: { usage: { "100": {}, "80": {}, "95": {} } },
    allowOnlineResize: true,
    region: "iad",
    sizeMB: 500,
  });
  const mysqlVolume = volume("mysql-volume", {
    alerts: { usage: { "100": {}, "80": {}, "95": {} } },
    allowOnlineResize: true,
    region: "iad",
    sizeMB: 500,
  });
  const petfaveWeb = service("petfave-web", {
    build: {
      buildEnvironment: "V3",
      builder: "DOCKERFILE",
      dockerfilePath: "Dockerfile",
    },
    healthcheck: "/api/session",
    healthcheckTimeout: 300,
    deploy: {
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 5,
    },
    replicas: { iad: 1 },
    volumeMounts: { "/var/www/html/storage": petfaveWebVolume },
  });

  return project("PetFave", {
    variables: { managed: false },
    resources: [petfaveWeb, MySQL, petfaveWebVolume, mysqlVolume],
  });
});
