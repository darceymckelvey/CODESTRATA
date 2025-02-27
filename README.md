# codestrata-cli-test

=======

# Codestrata CLI

A geological-themed Git CLI that transforms your version control experience. Instead of git commands, use intuitive geological terms to manage your code layers!

## Installation

```bash
npm install -g codestrata-cli
```

## Commands

| Codestrata Command                   | Git Equivalent      | Description                               |
| ------------------------------------ | ------------------- | ----------------------------------------- |
| `strata create-vault`                | `git init`          | Initialize a new repository               |
| `strata excavate`                    | `git status`        | Check repository status                   |
| `strata fossilize "message"`         | `git commit`        | Save changes with a message               |
| `strata stratum-shift branch-name`   | `git branch`        | Create a new code layer (branch)          |
| `strata connect-vault origin url`    | `git remote add`    | Connect to a remote repository            |
| `strata uplift origin main`          | `git push`          | Push changes to remote                    |
| `strata unearth [remote]`            | `git fetch`         | Fetch changes from remote                 |
| `strata shift-to branch-name`        | `git checkout`      | Switch to a different code layer (branch) |
| `strata map-strata`                  | `git branch --list` | List all code layers (branches)           |
| `strata fuse-strata branch-name`     | `git merge`         | Merge code layers (branches)              |
| `strata preserve`                    | `git stash`         | Temporarily store changes                 |
| `strata unearth-artifact <files...>` | `git add`           | Stage files for commit                    |
| `strata erode-strata branch-name`    | `git branch -d`     | Delete a code layer (branch)              |

## Quick Start

```bash
# Create a new repository
strata create-vault

# Check status
strata excavate

# Commit changes
strata fossilize "Initial rock formation"

# Create a new branch
strata stratum-shift feature-layer

# Connect to GitHub
strata connect-vault origin https://github.com/username/repo.git

# Push your changes
strata uplift origin main

# Stage new or modified files
strata unearth-artifact new_file.txt modified_file.js
```

## Why Geological Terms?

Just as geologists study Earth's history through rock layers, developers manage code through layers of changes:

- Commits become "fossils" - preserved snapshots of your code
- Branches become "strata" - different layers of development
- Status checks become "excavations" - examining your current state
- Pushing becomes "uplift" - elevating your code to remote repositories

## Command Details

### create-vault

Initializes a new git repository:

```bash
strata create-vault
```

### excavate

Shows the current status of your repository:

```bash
strata excavate
```

### fossilize

Creates a commit with your changes:

```bash
strata fossilize "Add new feature layer"
```

### stratum-shift

Creates a new branch:

```bash
strata stratum-shift feature-name
```

### connect-vault

Connects to a remote repository:

```bash
strata connect-vault origin https://github.com/username/repo.git
```

### uplift

Pushes changes to the remote repository:

```bash
strata uplift origin main
```

### unearth

Fetches changes from the remote repository:

```bash
strata unearth
# or
strata unearth origin
```

## Requirements

- Node.js >=14.0.0
- Git installed and available in PATH

## Contributing

Contributions are welcome! Feel free to:

1. Create new stratum (`strata stratum-shift feature/amazing-feature`)
2. Fossilize your changes (`strata fossilize "Add amazing feature"`)
3. Uplift to master (`strata uplift origin main`)
4. Open a Pull Request

## License

MIT

## Support

If you encounter any issues:

1. Check the command help with `strata --help`
2. Use `strata [command] --help` for specific command details
3. Open an issue on GitHub
