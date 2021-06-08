const core = require('@actions/core');
const child_process = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const { home, sshAgent, sshAdd } = require('./paths.js');

const homeSsh = home + '/.ssh';

try {
    const deployKeyInfoInput = core.getInput('deploy-key-info');
    const deployKeyInfoList = JSON.parse(deployKeyInfoInput);

    //Validate the arguments 
    if (!deployKeyInfoList) {
        core.setFailed("The deploy-key-info argument is empty. Maybe you are using a wrong secret name in your workflow file.");
        return;
    }
    let argErrors = [];
    let i = 1;
    deployKeyInfoList.forEach(deployKeyInfo => {
        if (!deployKeyInfo.orgAndRepo || !deployKeyInfo.envName)
          argErrors.push(`Item ${i} has missing arg(s).  It must contain the orgAndRepo as well as the name of the environment variable containing the private ssh key.`);
        
        if (!process.env[`${deployKeyInfo.envName}`])
          argErrors.push(`The environment variable '${deployKeyInfo.envName}' for Item ${i} has not been populated.  It must be set under the 'env:' section of the step or the workflow.`);
        i++;
    });
    if (argErrors.length > 0){
      core.setFailed(`There were one or more errors with the arguments: ${argErrors.join(', ')}`);
      return;
    }
    

    //Start the agent
    core.info("Starting ssh-agent");
    // Extract auth socket path and agent pid and set them as job variables
    child_process.execFileSync(sshAgent).toString().split("\n").forEach(function(line) {
        const matches = /^(SSH_AUTH_SOCK|SSH_AGENT_PID)=(.*); export \1/.exec(line);

        if (matches && matches.length > 0) {
            // This will also set process.env accordingly, so changes take effect for this script
            core.exportVariable(matches[1], matches[2]);
            core.info(`${matches[1]}=${matches[2]}`);
        }
    });

    
    //Process each key
    deployKeyInfoList.forEach(deployKeyInfo => {
       //The actual key is a secret stored in an environment variable, the info arg tells us which env variable.
       const ownerAndRepo = deployKeyInfo.orgAndRepo;
       const envName = deployKeyInfo.envName;
       const key = process.env[envName];
       

       core.startGroup(`Adding the private key for ${ownerAndRepo} to the ssh-agent`);
       child_process.execFileSync(sshAdd, ['-'], { input: key.trim() + "\n" });
       
       core.info('Adding insteadOf entries to git config...');
       const sha256 = crypto.createHash('sha256').update(key).digest('hex');
       fs.writeFileSync(`${homeSsh}/key-${sha256}`, key + "\n", { mode: '600' });

       child_process.execSync(`git config --global --replace-all url."git@key-${sha256}.github.com:${ownerAndRepo}".insteadOf "https://github.com/${ownerAndRepo}"`);
       child_process.execSync(`git config --global --add url."git@key-${sha256}.github.com:${ownerAndRepo}".insteadOf "git@github.com:${ownerAndRepo}"`);
       child_process.execSync(`git config --global --add url."git@key-${sha256}.github.com:${ownerAndRepo}".insteadOf "ssh://git@github.com/${ownerAndRepo}"`);

       // https://docs.github.com/en/developers/overview/managing-deploy-keys#using-multiple-repositories-on-one-server 
       core.info('Adding Host entry for repo to ssh config file...');
       const sshConfig = `\nHost key-${sha256}.github.com\n`
                             + `    HostName github.com\n`
                             + `    IdentityFile ${homeSsh}/key-${sha256}\n`
                             + `    IdentitiesOnly yes\n`;
       fs.appendFileSync(`${homeSsh}/config`, sshConfig);

       core.info(`Added deploy-key mapping: Use identity '${homeSsh}/key-${sha256}' for GitHub repository ${ownerAndRepo}`);

       core.endGroup();
    });

    console.log("\nFingerprints of Key(s) added:");
    child_process.execFileSync(sshAdd, ['-l'], { stdio: 'inherit' });

    console.log("\nPublic key parameters of Key(s) added:");
    child_process.execFileSync(sshAdd, ['-L'], { stdio: 'inherit' });

    
} catch (error) {

    if (error.code == 'ENOENT') {
        core.info(`The '${error.path}' executable could not be found. Please make sure it is on your PATH and/or the necessary packages are installed.`);
        core.info(`PATH is set to: ${process.env.PATH}`);
    }

    core.setFailed(error.message);
}