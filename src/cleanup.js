const core = require('@actions/core');
const { execSync } = require('child_process');
const { sshAgent } = require('./paths.js');

try {
  // Kill the started SSH agent
  core.info('Stopping SSH agent');
  execSync(sshAgent, ['-k'], { stdio: 'inherit' });
} catch (error) {
  core.info(error.message);
  core.info('Error stopping the SSH agent, proceeding anyway');
}
