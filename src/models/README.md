# Database Models

This directory contains all the Sequelize models that represent the database tables in the CodeStrata application.

## Database Structure

The CodeStrata database consists of the following tables:

### LithoProfiles

User profiles for the application.

- **Primary Key**: `id` (auto-increment)
- **Fields**:
  - `username`: User's display name (unique)
  - `email`: User's email address (unique)
  - `password_hash`: Hashed password
  - `role`: User role (student, instructor, admin)
  - `profile_data`: JSON field containing user preferences and settings
  - `TerrainPaths_id`: Foreign key to TerrainPaths
  - `StrataVaults_id`: Foreign key to strata_vaults
  - `TerrainProgress_id`: Foreign key to TerrainProgress
  - `TerrainReviews_id`: Foreign key to TerrainReviews
  - `created_at`: Timestamp of creation
  - `updated_at`: Timestamp of last update

### strata_vaults

Repositories for user code.

- **Primary Key**: `id` (auto-increment)
- **Fields**:
  - `profile_id`: Foreign key to LithoProfiles
  - `name`: Name of the vault
  - `path`: File system path to the vault
  - `description`: Description of the vault
  - `repository_uri`: URI to external repository (e.g., GitHub)
  - `current_branch`: Current Git branch
  - `Fossilizes_id`: Foreign key to Fosilizes
  - `artifacts`: JSON array of artifacts
  - `strata`: JSON array of strata
  - `created_at`: Timestamp of creation
  - `updated_at`: Timestamp of last update

### Fosilizes

Version control information for strata vaults.

- **Primary Key**: `id` (auto-increment)
- **Fields**:
  - `vault_id`: Foreign key to strata_vaults
  - `commit_hash`: Git commit hash
  - `message`: Commit message
  - `commited_at`: Timestamp of commit

### CoreSamples

Code samples or exercises.

- **Primary Key**: `id` (auto-increment)
- **Fields**:
  - `layer_id`: Layer identifier
  - `title`: Title of the sample
  - `instructions`: Instructions for the sample
  - `starter_code`: Initial code for the sample
  - `points`: Points value
  - `created_at`: Timestamp of creation

### TerrainPaths

Learning paths or courses.

- **Primary Key**: `id` (auto-increment)
- **Fields**:
  - `creator_id`: Foreign key to LithoProfiles (creator)
  - `name`: Name of the path
  - `description`: Description of the path
  - `is_active`: Whether the path is active
  - `is_public`: Whether the path is public
  - `created_at`: Timestamp of creation
  - `TerrainReviews_id`: Foreign key to TerrainReviews

### TerrainProgress

User progress through terrain paths.

- **Primary Key**: `id` (auto-increment)
- **Fields**:
  - `profile_id`: Foreign key to LithoProfiles
  - `path_id`: Foreign key to TerrainPaths
  - `current_layer`: Current layer in the path
  - `enrolled_at`: Timestamp of enrollment

### TerrainReviews

Reviews of terrain paths.

- **Primary Key**: `id` (auto-increment)
- **Fields**:
  - `path_id`: Foreign key to TerrainPaths
  - `reviewer_id`: Foreign key to LithoProfiles (reviewer)
  - `review_status`: Status of the review (pending, approved, rejected)
  - `feedback`: Review feedback
  - `reviewed_at`: Timestamp of review

## Relationships

- **LithoProfile** has many **StrataVault** (one-to-many)
- **StrataVault** belongs to **LithoProfile** (many-to-one)
- **StrataVault** has many **Fosilize** (one-to-many)
- **Fosilize** belongs to **StrataVault** (many-to-one)
- **LithoProfile** has many **TerrainPath** as creator (one-to-many)
- **TerrainPath** belongs to **LithoProfile** as creator (many-to-one)
- **TerrainPath** belongs to **TerrainReview** (one-to-one)
- **TerrainReview** has one **TerrainPath** (one-to-one)
- **LithoProfile** has many **TerrainReview** as reviewer (one-to-many)
- **TerrainReview** belongs to **LithoProfile** as reviewer (many-to-one)
- **LithoProfile** has many **TerrainProgress** (one-to-many)
- **TerrainProgress** belongs to **LithoProfile** (many-to-one)
- **TerrainPath** has many **TerrainProgress** as enrollments (one-to-many)
- **TerrainProgress** belongs to **TerrainPath** (many-to-one)

## Usage

Models are automatically loaded and associations are set up when the application starts. You can import models from this directory:

```typescript
import { LithoProfile, StrataVault } from '../models';

// Example: Find a user and their vaults
const user = await LithoProfile.findByPk(userId, {
  include: [{ model: StrataVault, as: 'vaults' }]
});
```

## Database Initialization

To initialize the database:

```bash
# Create tables if they don't exist
npm run init-db

# Drop and recreate all tables (caution!)
npm run init-db:force

# Create tables and seed with initial data
npm run init-db:seed
