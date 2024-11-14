import { spawn } from 'child_process';

export default {
  execute(command: string, log: boolean = false): Promise<any> {
    return new Promise<any>(function (resolve, reject) {

      if (log) console.log('\n----- COMMAND -----\n', command.replace(/;/g, ';\\\n').replace(/color/g, '\ncolor') + '\n\n---- END COMMAND -----')
      const ls = spawn(command, [], { shell: true })

      ls.stdout.on('data', data => {
        if (log) console.log(`stdout: ${data}`)
      })

      ls.stderr.on('data', data => {
        if (log) console.log(`stderr: ${data}`)
      })

      ls.on('error', (error) => {
        if (log) console.log(`error: ${error.message}`)
        reject()
      })

      ls.on('close', code => {
        if (log) console.log(`child process exited with code ${code}`)
        resolve('')
      })
    })
  }
}