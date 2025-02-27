import { program } from 'commander';
import { CommitResult, simpleGit, SimpleGit, StatusResult } from 'simple-git';

const git: SimpleGit = simpleGit();

program.name('strata').description('Codestrata CLI').version('1.0.0');

// Initializes a new Git repository using `git init`.
program
  .command('create-vault')
  .description('Initialize a new StrataVault (git init)')
  .action(async () => {
    try {
      await git.init();
      console.log('New StrataVault created successfully');
    } catch (error: any) {
      console.error('Vault creation failed:', error.message);
    }
  });

// Stages all changes with `git add .` and commits them with `git commit -m <message>`.
// It checks for changes before committing and informs the user if there's nothing to commit.
program
  .command('fossilize')
  .description('Preserve code changes (git commit)')
  .argument('<message...>', 'fossilization message')
  .action(async (message: string[]): Promise<void> => {
    const commitMessage = message.join(' ');
    try {
      const status: StatusResult = await git.status();
      if (!status.staged.length && !status.modified.length) {
        console.log('No changes to fossilize');
        return;
      }
      await git.add('.');
      const result: CommitResult = await git.commit(commitMessage);
      console.log('Fossilized changes:', result.summary);
    } catch (error: any) {
      console.error('Fossilization failed:', error.message);
    }
  });

// Creates a new branch using `git checkout -b <name>`. "Stratum" refers to a branch.
program
  .command('stratum-shift')
  .description('Create new code layer (git branch)')
  .argument('<name>', 'shift name')
  .action(async (name: string) => {
    try {
      await git.checkoutLocalBranch(name);
      console.log(`Created new stratum: ${name}`);
    } catch (error: any) {
      console.error('Stratum shift failed:', error.message);
    }
  });

// Displays the repository status, including modified, untracked, and staged files,
// using `git status`.
program
  .command('excavate')
  .description('Check repository status')
  .action(async () => {
    try {
      const status: StatusResult = await git.status();
      console.log('\n📊 Current excavation status:');

      if (status.modified.length > 0) {
        console.log('\nModified artifacts:');
        status.modified.forEach((file) => console.log(`  📝 ${file}`));
      }

      if (status.not_added.length > 0) {
        console.log('\nUntracked artifacts:');
        status.not_added.forEach((file) => console.log(`  ❓ ${file}`));
      }

      if (status.staged.length > 0) {
        console.log('\nStaged artifacts:');
        status.staged.forEach((file) => console.log(`  ✅ ${file}`));
      }
    } catch (error: any) {
      console.error('❌ Excavation failed:', error.message);
    }
  });

// Pushes changes to a remote repository with `git push <remote> <branch>`.
// Defaults to `origin` and `master`.
program
  .command('uplift')
  .description('Push changes to remote (git push)')
  .argument('[remote]', 'remote name', 'origin')
  .argument('[branch]', 'branch name', 'master')
  .action(async (remote: string, branch: string) => {
    try {
      await git.push(remote, branch);
      console.log('Uplifted changes to remote vault');
    } catch (error: any) {
      console.error('Uplift failed:', error.message);
    }
  });

// Adds a remote repository using `git remote add <name> <url>`.
program
  .command('connect-vault')
  .description('Connect to remote vault (git remote add)')
  .argument('<name>', 'remote name')
  .argument('<url>', 'remote vault URL')
  .action(async (name, url) => {
    try {
      await git.addRemote(name, url);
      console.log(`Connected to remote vault: ${name}`);
    } catch (error: any) {
      console.error('Connection failed:', error.message);
    }
  });

// Fetches changes from a remote repository using `git fetch <remote>`. Defaults to `origin`.
program
  .command('unearth')
  .description('Fetch changes from remote (git fetch)')
  .argument('[remote]', 'remote name', 'origin')
  .action(async (remote) => {
    try {
      await git.fetch(remote);
      console.log('Unearthed changes from remote vault');
    } catch (error: any) {
      console.error('Unearthing failed:', error.message);
    }
  });

// Switches to a different branch with `git checkout <name>`.
program
  .command('shift-to')
  .description('Switch to different code layer (git checkout)')
  .argument('<name>', 'branch name')
  .action(async (name) => {
    try {
      await git.checkout(name);
      console.log(`Shifted to stratum: ${name}`);
    } catch (error: any) {
      console.error('Shift failed:', error.message);
    }
  });

//  Lists all branches using `git branch --list` and indicates the current branch.
program
  .command('map-strata')
  .description('List all code layers (git branch --list)')
  .action(async () => {
    try {
      const branches = await git.branch();
      console.log('Available strata:');
      branches.all.forEach((branch) => {
        console.log(`  ${branch === branches.current ? '✨' : '📍'} ${branch}`);
      });
    } catch (error: any) {
      console.error('Mapping failed:', error.message);
    }
  });

//  Merges the specified branch into the current branch using `git merge --no-ff <branch>`.
//  The `--allow-unrelated` option adds `--allow-unrelated-histories`.
program
  .command('fuse-strata')
  .description('Merge code layers (git merge)')
  .argument('<branch>', 'branch to merge from')
  .option('--allow-unrelated', 'Allow merging unrelated histories')
  .action(async (branch, options) => {
    try {
      const mergeOptions = ['--no-ff'];
      if (options.allowUnrelated) {
        mergeOptions.push('--allow-unrelated-histories');
      }
      const result = await git.merge([branch, ...mergeOptions]);
      console.log('Successfully fused layers:', result.merges);
    } catch (error: any) {
      console.error('Fusion failed:', error.message);
    }
  });

// Stashes current changes using `git stash`.
program
  .command('preserve')
  .description('Temporarily store changes (git stash)')
  .action(async () => {
    try {
      await git.stash();
      console.log('Changes preserved in geological storage');
    } catch (error: any) {
      console.error('Preservation failed:', error.message);
    }
  });

// Stages files for commit using `git add`.
program
  .command('unearth-artifact')
  .description('Stage files for commit (git add)')
  .argument('<files...>', 'Files to stage')
  .action(async (files: string[]) => {
    try {
      await git.add(files);
      console.log(
        'Artifacts unearthed and staged for fossilization:',
        files.join(', ')
      );
    } catch (error: any) {
      console.error('Failed to unearth artifacts:', error.message);
    }
  });

//  Deletes a local branch using `git branch -d <name>`.
program
  .command('erode-strata')
  .description('Delete a code layer (git branch -d)')
  .argument('<name>', 'branch name to delete')
  .action(async (name) => {
    try {
      await git.deleteLocalBranch(name);
      console.log(`Eroded stratum: ${name}`);
    } catch (error: any) {
      console.error('Erosion failed:', error.message);
    }
  });

//  Deletes a remote branch using `git push origin --delete <name>`.
program
  .command('erode-remote-strata')
  .description('Delete a remote code layer (git push origin --delete)')
  .argument('<name>', 'branch name to delete')
  .action(async (name) => {
    try {
      await git.push(['origin', '--delete', name]);
      console.log(`Eroded remote stratum: ${name}`);
    } catch (error: any) {
      console.error('Remote erosion failed:', error.message);
    }
  });

program.parse();
