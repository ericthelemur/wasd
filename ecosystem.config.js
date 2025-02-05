module.exports = {
  apps: [{
    name: "NodeCG",
    script: "index.js",
    cwd: "../..",

    watch: [
      "./extension/index.js"
    ],
    log_file: "./pm2.log",
    combine_logs: true,
    autorestart: true,
  }]
}
