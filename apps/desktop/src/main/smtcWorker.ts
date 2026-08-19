import { parentPort, workerData } from 'worker_threads'
import { spawn, type ChildProcess } from 'child_process'

// We must pass the executable path via workerData
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
    
    helperProcess.stdout.on('data', (data: Buffer) => {
      buffer += data.toString('utf-8')
      let newlineIdx: number
      while ((newlineIdx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newlineIdx).trim()
        buffer = buffer.slice(newlineIdx + 1)
        if (line) {
          try {
            const msg = JSON.parse(line)
            if (msg.type === 'update') {
              // Convert base64 thumbnail to Buffer so MediaDetectionService can handle it
              if (msg.session && msg.session.media && msg.session.media.thumbnailBase64 && msg.session.media.thumbnailBase64 !== 'null') {
                msg.session.media.thumbnail = Buffer.from(msg.session.media.thumbnailBase64, 'base64')
                delete msg.session.media.thumbnailBase64
              }
              if (parentPort) {
                parentPort.postMessage(msg)
              }
            }
          } catch (e) {
            // ignore parse error
          }
        }
      }
    })

    helperProcess.stderr?.on('data', (data: Buffer) => {
      if (parentPort) {
        parentPort.postMessage({ type: 'error', error: data.toString('utf-8') })
      }
    })
    
    helperProcess.on('exit', () => {
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
        helperProcess.stdin.write('stop\n')
        helperProcess.stdin.end()
      } catch (e) {
        // ignore
      }
    }
    process.exit(0)
  }
})
