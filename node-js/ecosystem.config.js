module.exports = {
  apps: [{
    name: 'ewallet-api',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/ewallet-api/pm2-error.log',
    out_file: '/var/log/ewallet-api/pm2-out.log',
    log_file: '/var/log/ewallet-api/combined.log',
    time: true,
    merge_logs: true,
    kill_timeout: 5000,
    listen_timeout: 5000,
    instances: 4,
    instance_var: 'INSTANCE_ID'
  }],
  
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/ewallet-api.git',
      path: '/var/www/ewallet-api',
      'post-deploy': 'npm install --production && npm run migrate && pm2 reload ecosystem.config.js --env production'
    }
  }
};
