const { spawn } = require('child_process');
const path = require('path');

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// 启动后端服务
function startBackend() {
    return new Promise((resolve, reject) => {
        log('正在启动后端服务...', 'blue');
        
        const backendPath = path.join(__dirname, 'backend');
        
        // 先安装依赖
        const pipInstall = spawn('pip', ['install', '-r', 'requirements.txt'], {
            cwd: backendPath,
            shell: true,
            stdio: 'inherit'
        });

        pipInstall.on('close', (code) => {
            if (code !== 0) {
                log(`后端依赖安装失败，退出码: ${code}`, 'red');
                reject(new Error('后端依赖安装失败'));
                return;
            }
            
            log('后端依赖安装完成，启动服务...', 'green');
            
            // 启动后端服务
            const backend = spawn('python', ['main.py'], {
                cwd: backendPath,
                shell: true,
                stdio: 'inherit'
            });

            backend.on('error', (err) => {
                log(`后端服务启动错误: ${err.message}`, 'red');
                reject(err);
            });

            // 等待几秒确保服务启动
            setTimeout(() => {
                log('后端服务已启动', 'green');
                resolve(backend);
            }, 3000);
        });

        pipInstall.on('error', (err) => {
            log(`后端依赖安装错误: ${err.message}`, 'red');
            reject(err);
        });
    });
}

// 启动前端服务
function startFrontend() {
    return new Promise((resolve, reject) => {
        log('正在启动前端服务...', 'blue');
        
        const frontendPath = path.join(__dirname, 'BillNote_frontend');
        
        // 先安装依赖
        const pnpmInstall = spawn('pnpm', ['install'], {
            cwd: frontendPath,
            shell: true,
            stdio: 'inherit'
        });

        pnpmInstall.on('close', (code) => {
            if (code !== 0) {
                log(`前端依赖安装失败，退出码: ${code}`, 'red');
                reject(new Error('前端依赖安装失败'));
                return;
            }
            
            log('前端依赖安装完成，启动开发服务器...', 'green');
            
            // 启动前端开发服务器
            const frontend = spawn('pnpm', ['dev'], {
                cwd: frontendPath,
                shell: true,
                stdio: 'inherit'
            });

            frontend.on('error', (err) => {
                log(`前端服务启动错误: ${err.message}`, 'red');
                reject(err);
            });

            setTimeout(() => {
                log('前端服务已启动', 'green');
                resolve(frontend);
            }, 3000);
        });

        pnpmInstall.on('error', (err) => {
            log(`前端依赖安装错误: ${err.message}`, 'red');
            reject(err);
        });
    });
}

// 主函数
async function main() {
    log('========================================', 'yellow');
    log('       BiliNote 开发环境启动工具        ', 'yellow');
    log('========================================', 'yellow');
    
    const processes = [];
    
    try {
        // 启动后端
        const backendProcess = await startBackend();
        processes.push(backendProcess);
        
        // 启动前端
        const frontendProcess = await startFrontend();
        processes.push(frontendProcess);
        
        log('', 'reset');
        log('========================================', 'green');
        log('    所有服务已启动！按 Ctrl+C 停止    ', 'green');
        log('========================================', 'green');
        
    } catch (error) {
        log(`启动失败: ${error.message}`, 'red');
        process.exit(1);
    }
    
    // 处理退出
    process.on('SIGINT', () => {
        log('', 'reset');
        log('正在关闭所有服务...', 'yellow');
        processes.forEach(proc => {
            if (proc && !proc.killed) {
                proc.kill('SIGINT');
            }
        });
        setTimeout(() => process.exit(0), 1000);
    });
    
    process.on('SIGTERM', () => {
        processes.forEach(proc => {
            if (proc && !proc.killed) {
                proc.kill('SIGTERM');
            }
        });
        setTimeout(() => process.exit(0), 1000);
    });
}

main();
