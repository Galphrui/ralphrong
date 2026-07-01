import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const children = []

await runOnce('node', ['scripts/verify-config.mjs'])

start('backend', process.execPath, ['local-admin-server.mjs'], {
  PORT: '3001',
})
start('web', npmCommand(), ['run', 'dev:web', '--', '--host', '127.0.0.1'])

console.log('\n本地开发环境已启动：')
console.log('- 前台：http://127.0.0.1:5173/')
console.log('- 后台：http://127.0.0.1:3001/login.html')
console.log('- API：http://127.0.0.1:3001/api\n')

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

function start(name, command, args, env = {}) {
  const child = spawn(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  children.push(child)
  child.stdout.on('data', (chunk) => write(name, chunk))
  child.stderr.on('data', (chunk) => write(name, chunk))
  child.on('exit', (code, signal) => {
    if (signal) return
    console.log(`[${name}] exited with code ${code}`)
    shutdown()
  })
}

function runOnce(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit' })
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(' ')} failed with code ${code}`))
    })
  })
}

function write(name, chunk) {
  String(chunk)
    .split(/\r?\n/)
    .filter(Boolean)
    .forEach((line) => console.log(`[${name}] ${line}`))
}

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM')
  }
  process.exit(0)
}

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm'
}
