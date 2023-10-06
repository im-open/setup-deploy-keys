const os = require('os');

module.exports =
  process.env['OS'] != 'Windows_NT'
    ? {
        home: os.userInfo().homedir,
        sshAgent: 'ssh-agent',
        sshAdd: 'ssh-add'
      }
    : {
        home: os.homedir(),
        sshAgent: 'c://progra~1//git//usr//bin//ssh-agent.exe',
        sshAdd: 'c://progra~1//git//usr//bin//ssh-add.exe'
      };
