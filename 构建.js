const { spawn } = require('child_process');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const SERVER = 'root@10.3.104.112';
const REMOTE_DIR = '/docker-run-config/BiliNote';

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    log(`> ${cmd} ${args.join(' ')}`, 'cyan');
    const proc = spawn(cmd, args, { cwd: cwd || __dirname, shell: true, stdio: 'inherit' });
    proc.on('close', code => code === 0 ? resolve() : reject(new Error(`退出码: ${code}`)));
    proc.on('error', err => reject(err));
  });
}

// 远程执行命令（整个命令用引号包裹，避免 Windows shell 本地解释 &&）
function ssh(command) {
  return run('ssh', [SERVER, `"${command}"`]);
}

// 打包前端源码
function packFrontend() {
  const frontendDir = path.join(__dirname, 'BillNote_frontend');
  return run('tar', [
    'czf', '/tmp/frontend-src.tar.gz',
    '-C', frontendDir,
    'src', 'package.json', 'pnpm-lock.yaml', 'vite.config.ts', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'index.html'
  ]);
}

async function deployFrontend(isFull) {
  log('--- 前端：打包源码 ---', 'blue');
  await packFrontend();

  log('--- 前端：上传到服务器 ---', 'blue');
  await run('scp', ['/tmp/frontend-src.tar.gz', `${SERVER}:/tmp/`]);

  const remoteCmds = [
    `cd ${REMOTE_DIR}`,
  ];

  if (isFull) {
    log('--- 前端：全量构建（重建 base） ---', 'blue');
    remoteCmds.push(
      'tar xzf /tmp/frontend-src.tar.gz -C BillNote_frontend/',
      `docker build -f BillNote_frontend/Dockerfile.base -t bilinote-frontend-base .`,
    );
  } else {
    remoteCmds.push('tar xzf /tmp/frontend-src.tar.gz -C BillNote_frontend/');
  }

  remoteCmds.push(
    'rm /tmp/frontend-src.tar.gz',
    'docker-compose build frontend',
    'docker-compose up -d frontend',
  );

  log('--- 前端：远程构建 ---', 'blue');
  await ssh(remoteCmds.join(' && '));
}

async function deployBackend(isFull) {
  if (isFull) {
    log('--- 后端：全量构建（同步全部源码 + 重建 base） ---', 'blue');
    await run('scp', ['-r', path.join(__dirname, 'backend').replace(/\\/g, '/') + '/', `${SERVER}:${REMOTE_DIR}/backend/`]);
    await ssh(`cd ${REMOTE_DIR} && docker build -f backend/Dockerfile.base -t bilinote-backend-base . && docker-compose build backend && docker-compose up -d backend`);
  } else {
    log('--- 后端：同步 app 代码 ---', 'blue');
    await run('scp', ['-r', path.join(__dirname, 'backend', 'app').replace(/\\/g, '/') + '/', `${SERVER}:${REMOTE_DIR}/backend/app/`]);
    log('--- 后端：远程构建 ---', 'blue');
    await ssh(`cd ${REMOTE_DIR} && docker-compose build backend && docker-compose up -d backend`);
  }
}

async function main() {
  const raw = process.argv.slice(2);
  const isFull = raw.includes('full');
  const set = new Set(raw);
  const doFrontend = set.has('frontend');
  const doBackend = set.has('backend');
  const both = !doFrontend && !doBackend;

  const parts = [];
  if (both || doFrontend) parts.push('前端');
  if (both || doBackend) parts.push('后端');

  log('============================================', 'yellow');
  log(`         BiliNote 远程构建`, 'yellow');
  log(`         模式: ${isFull ? '全量构建' : '基于 base 构建'}`, 'yellow');
  log(`         目标: ${parts.join(' + ')}`, 'yellow');
  log(`         服务器: ${SERVER}`, 'yellow');
  log('============================================', 'yellow');

  try {
    if (both || doFrontend) {
      await deployFrontend(isFull);
    }
    if (both || doBackend) {
      await deployBackend(isFull);
    }

    log('', 'reset');
    log('============================================', 'green');
    log(`     构建完成，${parts.join(' + ')} 已更新`, 'green');
    log('============================================', 'green');
  } catch (err) {
    log(`\n构建失败: ${err.message}`, 'red');
    process.exit(1);
  }
}

main();
