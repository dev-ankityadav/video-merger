import { spawn } from 'child_process';

export default {
  /**
   * Executes a shell command.
   * @param command The command to execute.
   * @param log Boolean indicating whether to log command output.
   * @return A promise that resolves with the command output or rejects with an error.
   */
  async execute(command: string, log: boolean = false): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      if (log) {
        console.log('\n----- COMMAND -----\n', command.replace(/;/g, ';\n').replace(/color/g, '\ncolor') + '\n\n---- END COMMAND -----');
      }

      const ls = spawn(command, [], { shell: true });
      let output = '';

      ls.stdout.on('data', data => {
        output += data.toString();
        if (log) console.log(`stdout: ${data}`);
      });

      ls.stderr.on('data', data => {
        if (log) console.log(`stderr: ${data}`);
      });

      ls.on('error', error => {
        if (log) console.log(`error: ${error.message}`);
        reject(error);
      });

      ls.on('close', code => {
        if (log) console.log(`child process exited with code ${code}`);
        resolve(output.trim());
      });
    });
  }
}