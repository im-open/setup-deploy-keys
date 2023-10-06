const core = require('@actions/core');
const child_process = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const { home, sshAgent, sshAdd } = require('./paths.js');

const homeSsh = `${home}/.ssh`;

// When used, this requiredArgOptions will cause the action to error if a value has not been provided.
const requiredArgOptions = {
  required: true,
  trimWhitespace: true
};
const deployKeyInfoInput = core.getInput('deploy-key-info', requiredArgOptions);

function printKeyInfo() {
  core.info('\nFingerprints of Key(s) added:');
  child_process.execFileSync(sshAdd, ['-l'], { stdio: 'inherit' });

  core.info('\nPublic key parameters of Key(s) added:');
  child_process.execFileSync(sshAdd, ['-L'], { stdio: 'inherit' });
}

async function processKey(orgAndRepo, envName) {
  // The actual deploy key secret should be stored in this environment variable
  const deployKey = process.env[envName];

  try {
    core.info('\nAdding deploy key to ssh-agent...');
    child_process.execFileSync(sshAdd, ['-'], { input: deployKey.trim() + '\n' });
    core.info('Finished adding deploy key to ssh-agent.');

    const sshFolder = homeSsh;
    core.info(`\nChecking if the '${homeSsh}' directory exists...`);
    if (fs.existsSync(sshFolder)) {
      core.info(`The '${homeSsh}' directory exists.`);
    } else {
      core.info(`The '${homeSsh}' directory does not exist, create it.`);
      await fs.promises.mkdir(sshFolder, { recursive: true });
      core.info(`The '${homeSsh}' directory was created.`);
    }

    core.info('\nWriting sha256 hashed key to ssh directory...');
    const sha256 = crypto.createHash('sha256').update(deployKey).digest('hex');
    const content = `${deployKey}\n`;
    const fileName = `${homeSsh}/key-${sha256}`;
    fs.writeFileSync(fileName, content, { mode: '600' });
    core.setOutput('key-filename', `key-${sha256}`);
    core.info(`Hashed key written to ssh directory: "${homeSsh}/key-${sha256}"`);

    core.info('\nAdding insteadOf entries to git config...');
    const insteadOf1 = `git config --global --replace-all url."git@key-${sha256}.github.com:${orgAndRepo}".insteadOf "https://github.com/${orgAndRepo}"`;
    const insteadOf2 = `git config --global --add url."git@key-${sha256}.github.com:${orgAndRepo}".insteadOf "git@github.com:${orgAndRepo}"`;
    const insteadOf3 = `git config --global --add url."git@key-${sha256}.github.com:${orgAndRepo}".insteadOf "ssh://git@github.com/${orgAndRepo}"`;
    child_process.execSync(insteadOf1);
    child_process.execSync(insteadOf2);
    child_process.execSync(insteadOf3);
    core.info('insteadOf entries added to git config.');

    core.info('\nAdding Host entry for repo in ssh config file...');
    const hostEntry = `
Host key-${sha256}.github.com
    HostName github.com
    IdentityFile ${homeSsh}/key-${sha256}
    IdentitiesOnly yes
`;
    fs.appendFileSync(`${homeSsh}/config`, hostEntry);
    core.info('Host entry added for repo in ssh config file.');
  } catch (error) {
    core.setFailed(
      `An error occurred processing the deploy key for ${orgAndRepo}: ${error.message}`
    );
  }
}

function startTheSshAgent() {
  core.info('\nStarting ssh-agent');

  // Extract auth socket path and agent pid and set them as job variables
  // TODO:  do we need this?  It isn't documented and it doesn't seem to be used in enterprise
  child_process
    .execFileSync(sshAgent)
    .toString()
    .split('\n')
    .forEach(function (line) {
      const matches = /^(SSH_AUTH_SOCK|SSH_AGENT_PID)=(.*); export \1/.exec(line);

      if (matches && matches.length > 0) {
        // This will also set process.env accordingly, so changes take effect for this script
        core.exportVariable(matches[1], matches[2]);
        core.info(`${matches[1]}=${matches[2]}`);
      }
    });
}

function validateDeployKeyArg(deployKeyInfoInput) {
  let deployKeyInfoList;

  try {
    deployKeyInfoList = JSON.parse(deployKeyInfoInput);
  } catch (error) {
    const errorMessage = `An error occurred parsing the deploy-key-info argument: ${error.message}.\nPlease see the README.md for the proper format.`;
    core.setFailed(errorMessage);
    core.setOutput('validation-error', 'argument-parsing');
    return;
  }

  if (!deployKeyInfoList || deployKeyInfoList.length === 0) {
    const errorMessage = `The deploy-key-info argument is empty. Validate the correct value was sent in the workflow step.`;
    core.setFailed(errorMessage);
    core.setOutput('validation-error', 'empty-keys');
    return;
  }

  const argErrors = [];
  let i = 1;
  deployKeyInfoList.forEach(dk => {
    if (!dk.orgAndRepo) {
      argErrors.push(`Deploy Key ${i} is missing the orgAndRepo argument.`);
      core.setOutput('validation-error', 'missing-orgAndRepo');
    }
    if (!dk.envName) {
      argErrors.push(`Deploy Key ${i} is missing the envName argument.`);
      core.setOutput('validation-error', 'missing-envName');
    } else if (!process.env[dk.envName]) {
      const errorMessage = `Deploy Key ${i} specified '${dk.envName}' as the environment variable, but it has not been populated.  ${dk.envName} must be set under the 'env:' section of the step or the workflow.`;
      argErrors.push(errorMessage);
      core.setOutput('validation-error', 'unpopulated-env-var');
    }
    i++;
  });

  if (argErrors.length > 0) {
    core.setFailed(`There were one or more errors with the arguments: ${argErrors.join(', ')}`);
    return;
  }

  core.info(`The 'deploy-key-info' argument was parsed successfully.`);
  return deployKeyInfoList;
}

async function run() {
  try {
    const deployKeys = validateDeployKeyArg(deployKeyInfoInput);
    if (!deployKeys) return;

    startTheSshAgent();

    core.info('\nProcessing deploy keys...');
    for (const dk of deployKeys) {
      core.startGroup(dk.orgAndRepo);
      await processKey(dk.orgAndRepo, dk.envName);
      core.endGroup();
    }
    core.info('Finished processing deploy keys.');

    printKeyInfo();
  } catch (error) {
    if (error.code == 'ENOENT') {
      const errorMessage = `The '${error.path}' executable could not be found. Please make sure it is on your PATH and/or the necessary packages are installed.`;
      core.info(errorMessage);
      core.info(`PATH is set to: ${process.env.PATH}`);
    }

    core.setFailed(error.message);
  }
}
run();
