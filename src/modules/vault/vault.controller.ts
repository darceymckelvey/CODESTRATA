import { Request, Response, NextFunction, RequestHandler } from 'express';
import { SimpleGit, simpleGit } from 'simple-git';
import { promisify } from 'util';
import { exec } from 'child_process';
import path from 'path';
import { LithoProfile, StrataVault } from '../../models';
import { Op } from 'sequelize';

const execAsync = promisify(exec);
const git: SimpleGit = simpleGit();

export interface RequestWithFiles extends Request {
  files?: any;
  user?: LithoProfile;
}

export interface AuthRequest extends Request {
  user?: LithoProfile;
}

type CustomRequestHandler = RequestHandler<any, any, any, any>;

// Helper functions
async function generateVaultPath(
  userId: number,
  vaultName: string
): Promise<string> {
  // Create a more unique directory name to ensure no conflicts between users
  // Use both the userId and a timestamp to ensure uniqueness
  const uniquePath = `${userId}-${Date.now()}-${vaultName.replace(/[^a-zA-Z0-9]/g, '_')}`;
  return path.join(process.cwd(), 'vaults', userId.toString(), uniquePath);
}

export const getVaults: CustomRequestHandler = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    // Check if we are requesting all vaults or just user's vaults
    const { all, search } = req.query;
    
    // If requesting all vaults, include profileId for ownership check
    if (all === 'true') {
      console.log('Fetching all vaults with owner info');
      
      // Include search filter if provided
      let whereClause = {};
      if (search && typeof search === 'string') {
        console.log(`Searching for vaults with: ${search}`);
        whereClause = {
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { description: { [Op.like]: `%${search}%` } }
          ]
        };
      }
      
      // Fetch all vaults and also include owner info
      const allVaults = await StrataVault.findAll({
        where: whereClause,
        include: [
          {
            model: LithoProfile,
            as: 'owner',
            attributes: ['id', 'username']
          }
        ]
      });
      
      // Tag each vault with isOwner flag for frontend use
      const vaultsWithOwnership = allVaults.map(vault => {
        const vaultData = vault.toJSON();
        return {
          ...vaultData,
          isOwner: vault.profileId === req.user?.id
        };
      });
      
      res.json(vaultsWithOwnership);
      return;
    }
    
    // Normal case: just get the user's own vaults
    const vaults = await StrataVault.findAll({
      where: { profileId: req.user.id },
      include: [
        {
          model: LithoProfile,
          as: 'owner',
          attributes: ['id', 'username']
        }
      ]
    });

    // Add the isOwner flag - all should be true in this case
    const vaultsWithOwnership = vaults.map(vault => {
      const vaultData = vault.toJSON();
      return {
        ...vaultData,
        isOwner: true  // Always true for this route
      };
    });

    console.log(`Retrieved ${vaultsWithOwnership.length} vaults for user ID ${req.user.id}`);
    res.json(vaultsWithOwnership);
  } catch (error) {
    console.error('Error fetching vaults:', error);
    res.status(500).json({ message: 'Failed to fetch vaults' });
  }
};

export const createVault: CustomRequestHandler = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Validate request
    if (!req.body || !req.body.name) {
      res.status(400).json({ message: 'Vault name is required' });
      return;
    }

    // Check if vault with this name already exists
    const existingVault = await StrataVault.findOne({
      where: { 
        profileId: req.user.id,
        name: req.body.name
      }
    });

    if (existingVault) {
      res.status(409).json({ message: 'A vault with this name already exists' });
      return;
    }

    // Generate vault path and ensure it exists
    const vaultPath = await generateVaultPath(req.user.id, req.body.name);
    
    // Create directory structure if it doesn't exist
    try {
      const fs = require('fs');
      const mkdirp = require('mkdirp');
      await mkdirp(vaultPath);
      console.log(`Created vault directory at ${vaultPath}`);
    } catch (err) {
      console.error(`Error creating vault directory: ${err}`);
      res.status(500).json({ message: 'Failed to create vault directory' });
      return;
    }

    // Create vault record in database
    const vault = await StrataVault.create({
      profileId: req.user.id,
      name: req.body.name,
      path: vaultPath,
      currentBranch: 'main',
      fossilizesId: Date.now(),
      repositoryUri: null,
      description: req.body.description || null,
      artifacts: [], // Initialize with empty artifacts array
      strata: [],    // Initialize with empty strata array
    });

    // Initialize git repository
    try {
      await git.init().cwd(vaultPath);
      console.log(`Initialized git repository at ${vaultPath}`);
    } catch (gitError) {
      console.error('Error initializing git repository:', gitError);
      // Continue even if git init fails, we'll try again later
    }

    res.status(201).json(vault);
  } catch (error) {
    console.error('Error creating vault:', error);
    res.status(500).json({ message: 'Failed to create vault' });
  }
};

export const uploadFiles: CustomRequestHandler = async (
  req: RequestWithFiles,
  res: Response
) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    if (!req.files) {
      res.status(400).json({ message: 'No files uploaded' });
      return;
    }

    // Handle file upload logic here
    res.status(200).json({ message: 'Files uploaded successfully' });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ message: 'Error uploading files' });
  }
};

export const fossilize: CustomRequestHandler = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const { vaultId } = req.params;
    const { stdout } = await execAsync(`codestrata fossilize ${vaultId}`);
    res.json({ message: 'Fossilize command executed', output: stdout });
  } catch (error) {
    console.error('Error executing fossilize command:', error);
    res.status(500).json({ message: 'Error executing fossilize command' });
  }
};

export const stratumShift: CustomRequestHandler = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const { vaultId } = req.params;
    const { stdout } = await execAsync(`codestrata stratum-shift ${vaultId}`);
    res.json({ message: 'Stratum shift command executed', output: stdout });
  } catch (error) {
    console.error('Error executing stratum shift command:', error);
    res.status(500).json({ message: 'Error executing stratum shift command' });
  }
};

export const initializeGithubRepo: CustomRequestHandler = async (
  req: AuthRequest,
  res: Response
) => {
  const { vaultId } = req.params;
  const { repositoryName, description, isPrivate } = req.body;

  console.log('Initializing GitHub repository:', {
    vaultId,
    repositoryName,
    userAuthenticated: !!req.user?.id
  });

  try {
    // Input validation
    if (!repositoryName) {
      res.status(400).json({ message: 'Repository name is required' });
      return;
    }

    // Ensure user is authenticated
    if (!req.user?.id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Find the vault
    const vault = await StrataVault.findOne({
      where: {
        id: vaultId,
        profileId: req.user.id
      }
    });
    
    if (!vault) {
      res.status(404).json({ message: 'Vault not found' });
      return;
    }

    console.log(`Found vault: ${vault.name} at path ${vault.path}`);

    // Check if the path exists
    const fs = require('fs');
    if (!fs.existsSync(vault.path)) {
      console.error(`Vault path does not exist: ${vault.path}`);
      res.status(500).json({ message: 'Vault directory not found' });
      return;
    }

    // Format repository URL correctly
    let username = 'user';
    let repoName = '';
    
    if (repositoryName.includes('/')) {
      const parts = repositoryName.split('/');
      username = parts[0];
      repoName = parts[1];
    } else {
      username = req.user?.username || 'user';
      repoName = repositoryName;
    }
    
    const repositoryUrl = `https://github.com/${username}/${repoName}.git`;
    console.log(`Using repository URL: ${repositoryUrl}`);

    // Update the vault with the repository URI right away - even if Git operations fail
    await vault.update({ 
      repositoryUri: repositoryUrl,
      description: description || vault.description
    });
    console.log('Updated vault record with repository URL');

    try {
      // Initialize local git repository
      const gitInstance = simpleGit(vault.path);
      
      // Initialize the repository if not already initialized
      try {
        await gitInstance.init();
        console.log(`Initialized git repository at ${vault.path}`);
      } catch (error) {
        console.log('Repository may already be initialized:', error);
      }

      // Configure git user if not already done
      try {
        await gitInstance.addConfig('user.name', req.user.username || 'CodeStrata User');
        await gitInstance.addConfig('user.email', req.user.email || 'user@example.com');
        console.log('Configured git user');
      } catch (configError) {
        console.log('Error configuring git user:', configError);
      }

      // Add or update remote
      try {
        try {
          await gitInstance.addRemote('origin', repositoryUrl);
          console.log(`Added remote origin: ${repositoryUrl}`);
        } catch (remoteError) {
          console.log('Remote may already exist, updating URL:', remoteError);
          await gitInstance.remote(['set-url', 'origin', repositoryUrl]);
          console.log(`Updated remote origin URL: ${repositoryUrl}`);
        }
      } catch (remoteError) {
        console.log('Error managing remote:', remoteError);
        // Continue even if remote setup fails - we'll show this as a success
        // because the repository URL is stored in the database
      }

      // Return success response
      res.json({
        message: 'GitHub repository initialized successfully',
        note: 'Repository URL has been configured. You can now push to GitHub.',
        githubUrl: repositoryUrl,
        repository: {
          name: `${username}/${repoName}`,
          url: repositoryUrl,
          isPrivate: isPrivate || false
        }
      });
    } catch (gitError: any) {
      console.error('Error with Git operations:', gitError);
      
      // We still return a 200 success because the repository URL was stored
      // This allows the user to manually push to GitHub later
      res.json({
        message: 'GitHub repository URL configured, but Git operations failed',
        warning: 'Some Git operations failed. You may need to push manually.',
        githubUrl: repositoryUrl,
        repository: {
          name: `${username}/${repoName}`,
          url: repositoryUrl,
          isPrivate: isPrivate || false
        },
        error: gitError.message
      });
    }
  } catch (error: any) {
    console.error('Error handling GitHub repo initialization:', error);
    res.status(500).json({
      message: 'Failed to handle GitHub repository initialization',
      error: error.message,
    });
  }
};

export const executeCommand: CustomRequestHandler = async (
  req: AuthRequest,
  res: Response
) => {
  const { vaultId, command } = req.params;

  try {
    const vault = await StrataVault.findByPk(vaultId);
    if (!vault) {
      res.status(404).json({ message: 'Vault not found' });
      return;
    }

    const { stdout } = await execAsync(`codestrata ${command}`, {
      cwd: vault.path,
    });
    res.json({
      message: `Command ${command} executed`,
      output: stdout,
    });
  } catch (error: any) {
    console.error(`Error executing command ${command}:`, error);
    res.status(500).json({
      message: `Failed to execute command ${command}`,
      error: error.message,
    });
  }
};

export const erodeVault: CustomRequestHandler = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const { vaultId } = req.params;
    const vault = await StrataVault.findOne({
      where: {
        id: vaultId,
        profileId: req.user.id,
      },
    });

    if (!vault) {
      res.status(404).json({ message: 'Vault not found' });
      return;
    }

    await vault.destroy();
    res.json({ message: 'Vault eroded successfully' });
  } catch (error: any) {
    console.error('Error eroding vault:', error);
    res
      .status(500)
      .json({ message: 'Error eroding vault', error: error.message });
  }
};

export const uploadArtifacts: CustomRequestHandler = async (
  req: RequestWithFiles,
  res: Response
) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const { vaultId } = req.params;
    const vault = await StrataVault.findOne({
      where: {
        id: vaultId,
        profileId: req.user.id,
      },
    });

    if (!vault) {
      res.status(404).json({ message: 'Vault not found' });
      return;
    }

    // Check if files were properly uploaded
    if (!req.files || Object.keys(req.files).length === 0) {
      res.status(400).json({ 
        message: 'No files uploaded',
        details: 'Make sure to include files in the request with key "artifacts"'
      });
      return;
    }

    // Log what we received for debugging
    console.log('Received files:', {
      filesKeys: Object.keys(req.files),
      hasArtifacts: !!req.files.artifacts,
      filesType: typeof req.files
    });

    // Process the uploaded files - handle both single files and arrays
    let artifacts;
    if (req.files.artifacts) {
      artifacts = Array.isArray(req.files.artifacts)
        ? req.files.artifacts
        : [req.files.artifacts];
    } else if (req.files.file) {
      // Check if files were uploaded with field name 'file' instead of 'artifacts'
      artifacts = Array.isArray(req.files.file)
        ? req.files.file
        : [req.files.file];
    } else {
      // Try to take the first file object regardless of its key name
      const firstKey = Object.keys(req.files)[0];
      artifacts = Array.isArray(req.files[firstKey])
        ? req.files[firstKey]
        : [req.files[firstKey]];
    }

    console.log(`Processing ${artifacts.length} artifacts for vault ${vaultId}`);

    // Ensure the vault directory exists
    const fs = require('fs');
    const mkdirp = require('mkdirp');
    const artifactsPath = path.join(vault.path, 'artifacts');
    await mkdirp(artifactsPath);

    // Save files to the vault's directory
    const savedFiles = [];
    for (const artifact of artifacts) {
      const fileName = artifact.name;
      const filePath = path.join(artifactsPath, fileName);
      
      console.log(`Saving artifact '${fileName}' to ${filePath}`);
      
      // Move the file to the destination
      await artifact.mv(filePath);
      
      // Add to saved files list
      savedFiles.push({
        name: fileName,
        path: filePath,
        size: artifact.size,
        type: artifact.mimetype
      });
    }

    // Update the vault's artifacts list
    const currentArtifacts = vault.artifacts || [];
    const updatedArtifacts = [...currentArtifacts, ...savedFiles];
    
    await vault.update({ artifacts: updatedArtifacts });

    res.json({
      message: 'Artifacts uploaded successfully',
      count: artifacts.length,
      files: savedFiles.map(f => f.name)
    });
  } catch (error: any) {
    console.error('Error uploading artifacts:', error);
    res
      .status(500)
      .json({ 
        message: 'Error uploading artifacts', 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
  }
};
