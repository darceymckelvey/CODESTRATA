import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Interface for refresh token tracking
 */
export interface RefreshToken {
  token: string;
  expiresAt: Date;
  createdAt: Date;
  isRevoked: boolean;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Represents user profile data structure
 */
export interface ProfileData {
  createdAt: Date;
  lastLogin: Date;
  settings: Record<string, any>;
  preferences: Record<string, any>;
  githubAccessToken?: string;
  githubUsername?: string;
  githubId?: number;
  refreshTokens?: RefreshToken[]; // Track refresh tokens for revocation
  tokenVersion?: number; // Increment to invalidate all tokens
}

/**
 * Represents a user profile in the system.
 * Contains authentication and user preference data.
 */
export interface LithoProfileAttributes {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  role: 'student' | 'instructor' | 'admin';
  profileData: ProfileData;
  terrainPathsId: number | null;
  strataVaultsId: number | null;
  terrainProgressId: number | null;
  terrainReviewsId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface LithoProfileCreationAttributes extends Optional<LithoProfileAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class LithoProfile extends Model<LithoProfileAttributes, LithoProfileCreationAttributes> {
  public id!: number;
  public username!: string;
  public email!: string;
  public passwordHash!: string;
  public role!: 'student' | 'instructor' | 'admin';
  public profileData!: ProfileData;
  public terrainPathsId!: number | null;
  public strataVaultsId!: number | null;
  public terrainProgressId!: number | null;
  public terrainReviewsId!: number | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

LithoProfile.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING(45),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      // Remove unique constraint here as it's causing "Too many keys" error
      // We'll handle uniqueness at the application level
      validate: {
        isEmail: true,
      },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password_hash', // Map camelCase to snake_case in database
    },
    role: {
      type: DataTypes.ENUM('student', 'instructor', 'admin'),
      allowNull: false,
      defaultValue: 'student',
    },
    profileData: {
      type: DataTypes.JSON,
      allowNull: false,
      field: 'profile_data', // Map camelCase to snake_case in database
      defaultValue: {
        createdAt: new Date(),
        lastLogin: new Date(),
        settings: {},
        preferences: {},
      },
      validate: {
        isValidProfileData(value: any) {
          if (!value.createdAt || !value.lastLogin) {
            throw new Error('profileData must contain createdAt and lastLogin');
          }
        },
      },
    },
    terrainPathsId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'TerrainPaths_id', // Keep database field as is for compatibility
      references: {
        model: 'TerrainPaths',
        key: 'id',
      },
    },
    strataVaultsId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'StrataVaults_id', // Keep database field as is for compatibility
      references: {
        model: 'strata_vaults',
        key: 'id',
      },
    },
    terrainProgressId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'TerrainProgress_id', // Keep database field as is for compatibility
      references: {
        model: 'TerrainProgress',
        key: 'id',
      },
    },
    terrainReviewsId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'TerrainReviews_id', // Keep database field as is for compatibility
      references: {
        model: 'TerrainReviews',
        key: 'id',
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at', // Map camelCase to snake_case in database
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at', // Map camelCase to snake_case in database
    },
  },
  {
    sequelize,
    tableName: 'LithoProfiles',
    timestamps: true, // This model uses the standard timestamp fields
    hooks: {
      beforeValidate: (profile: LithoProfile) => {
        // Ensure profileData has the required fields
        if (!profile.profileData) {
          profile.profileData = {
            createdAt: new Date(),
            lastLogin: new Date(),
            settings: {},
            preferences: {},
          };
        }
      },
    },
  }
);

export default LithoProfile;
