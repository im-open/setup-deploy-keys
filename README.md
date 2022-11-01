# Setup Deploy Keys

A GitHub Action that enables the use of one or more deploy keys in order to access other private repositories. This action is based on [webfactory/ssh-agent] but has been modified to just handle deploy keys.

This modified action will take care of:
- Starting the ssh-agent
- Adding the provided keys to the agent
- Adding an [alias entry] in the ssh config for each deploy key provided.  The entry specifies which deploy key should be used for each host.
- Adding `insteadOf` rules in the git config.  These rules will rewrite git urls it encounters for the provided org/repo and point to the applicable alias entry that was added to the ssh config.  This will ensure it uses the right deploy key when interacting with different private repositories.

These entries and `insteadOf` rules are necessary when using multiple deploy keys because of the way GitHub handles requests. From [webfactory/ssh-agent]:
> When using Github deploy keys, GitHub servers will accept the first known key. But since deploy keys are scoped to a single repository, this might not be the key needed to access a particular repository. Thus, you will get the error message fatal: Could not read from remote repository. Please make sure you have the correct access rights and the repository exists. if the wrong key/repository combination is tried.

More details on context, usage, troubleshooting or known issues and limitations can be found on the original repository [webfactory/ssh-agent].

## Index

- [Inputs](#inputs)
- [Example](#example)
- [Contributing](#contributing)
  - [Recompiling](#recompiling)
  - [Incrementing the Version](#incrementing-the-version)
- [Code of Conduct](#code-of-conduct)
- [License](#license)
  
## Inputs

| Parameter         | Is Required | Description                                                                                                                                                                              |
| ----------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deploy-key-info` | true        | An array of deploy key info objects that contain the org/repo that the deploy key is intended for as well as the name of the environment variable that contains the private key's value. |

## Example

```yml
name: Map project versions
on: workflow_dispatch
env: 
  # These ENV variables contain the value of the private key
  # They can be set at the workflow, job or step level
  SSH_KEY_CENTRAL_LOGGING: ${{secrets.SSH_CENTRAL_LOGGING}}
  SSH_KEY_STORAGE_ACCOUNT: ${{secrets.SSH_STORAGE_ACCOUNT}}
  SSH_KEY_ON_PREM_EGRESS: ${{secrets.SSH_ON_PREM_EGRESS}}  

jobs:
  deploy-terraform:
    runs-on: ubuntu-20.04
    steps:
        - name: Checkout Repository
          uses: actions/checkout@v3
  
        - name: Setup deploy keys for use with Terraform
          uses: im-open/setup-deploy-keys@v1.1.1
          with:
            deploy-key-info: |
              [
                { "orgAndRepo": "im-platform/central-logging", "envName" : "SSH_KEY_CENTRAL_LOGGING" },
                { "orgAndRepo": "im-platform/storage-account-network-rules", "envName" : "SSH_KEY_STORAGE_ACCOUNT" },
                { "orgAndRepo": "im-platform/on-prem-egress-ips", "envName" : "SSH_KEY_ON_PREM_EGRESS" }
              ]
    
        - name: Setup Terraform
          id: setup
          uses: hashicorp/setup-terraform@v1.2.1
          with:
            terraform_version: ~>0.15.0
        
        - name: Terraform Init
          id: init
          run: terraform init
```

## Contributing

When creating new PRs please ensure:
1. The action has been recompiled.  See the [Recompiling](#recompiling) section below for more details.
2. For major or minor changes, at least one of the commit messages contains the appropriate `+semver:` keywords listed under [Incrementing the Version](#incrementing-the-version).
3. The `README.md` example has been updated with the new version.  See [Incrementing the Version](#incrementing-the-version).
4. The action code does not contain sensitive information.

### Recompiling

If changes are made to the action's code in this repository, or its dependencies, you will need to re-compile the action.

```sh
# Installs dependencies and bundles the code
npm run build

# Bundle the code (if dependencies are already installed)
npm run bundle
```

These commands utilize [esbuild](https://esbuild.github.io/getting-started/#bundling-for-node) to bundle the action and
its dependencies into a single file located in the `dist` folder.

### Incrementing the Version

This action uses [git-version-lite] to examine commit messages to determine whether to perform a major, minor or patch increment on merge.  The following table provides the fragment that should be included in a commit message to active different increment strategies.
| Increment Type | Commit Message Fragment                     |
| -------------- | ------------------------------------------- |
| major          | +semver:breaking                            |
| major          | +semver:major                               |
| minor          | +semver:feature                             |
| minor          | +semver:minor                               |
| patch          | *default increment type, no comment needed* |

## Code of Conduct

This project has adopted the [im-open's Code of Conduct](https://github.com/im-open/.github/blob/master/CODE_OF_CONDUCT.md).

## License

Copyright &copy; 2021, Extend Health, LLC. Code released under the [MIT license](LICENSE).

[git-version-lite]: https://github.com/im-open/git-version-lite
[webfactory/ssh-agent]: https://github.com/webfactory/ssh-agent
[alias entry]: https://docs.github.com/en/developers/overview/managing-deploy-keys#using-multiple-repositories-on-one-server 
[MIT license]: ./license