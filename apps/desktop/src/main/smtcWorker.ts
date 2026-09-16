import { parentPort, workerData } from 'worker_threads'
import { spawn, type ChildProcess } from 'child_process'
import { StringDecoder } from 'string_decoder'

const helperPath = workerData?.helperPath

if (!helperPath) {
  throw new Error('helperPath not provided in workerData')
}

let helperProcess: ChildProcess | null = null

function startHelper(): void {
  try {
    helperProcess = spawn(helperPath, [], { stdio: ['pipe', 'pipe', 'pipe'] })

    if (!helperProcess.stdout) return

    let buffer = ''
    const stdoutDecoder = new StringDecoder('utf-8')
    const stderrDecoder = new StringDecoder('utf-8')

    helperProcess.stdout.on('data', (data: Buffer) => {
      buffer += stdoutDecoder.write(data)
      let newlineIdx: number
      while ((newlineIdx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newlineIdx).trim()
        buffer = buffer.slice(newlineIdx + 1)
        if (line) {
          try {
            const msg = JSON.parse(line)
            if (msg.type === 'update') {
              if (parentPort) {
                parentPort.postMessage(msg)
              }
            }
          } catch (e) {
          }
        }
      }
    })

    helperProcess.stderr?.on('data', (data: Buffer) => {
      if (parentPort) {
        parentPort.postMessage({ type: 'error', error: stderrDecoder.write(data) })
      }
    })

    helperProcess.on('exit', () => {
      buffer += stdoutDecoder.end()
      if (buffer.trim()) {
        try {
          const msg = JSON.parse(buffer.trim())
          if (msg.type === 'update' && parentPort) {
            parentPort.postMessage(msg)
          }
        } catch (e) {
        }
      }
      helperProcess = null
    })
  } catch (err) {
    if (parentPort) {
      parentPort.postMessage({ type: 'error', error: String(err) })
    }
  }
}

startHelper()

parentPort?.on('message', (msg) => {
  if (msg === 'stop') {
    if (helperProcess && helperProcess.stdin) {
      try {
        helperProcess.stdin.write('stop\n', 'utf-8')
        helperProcess.stdin.end()
      } catch (e) {
      }
    }
    process.exit(0)
  } else if (msg && typeof msg === 'object' && msg.action) {
    if (helperProcess && helperProcess.stdin) {
      try {
        helperProcess.stdin.write(JSON.stringify(msg) + '\n', 'utf-8')
      } catch (e) {
      }
    }
  }
})
