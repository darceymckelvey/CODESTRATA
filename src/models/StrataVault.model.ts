import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Represents a code repository (vault) in the system.
 * Each vault contains code that can be versioned with "fossilize" operations.
 */
export interface StrataVaultAttributes {
  id: number;
  profileId: number;
  name: string;
  path: string;
  description: string | null;
  repositoryUri: string | null;
  currentBranch: string | null;
  fossilizesId: number;
  artifacts: string[];
  strata: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface StrataVaultCreationAttributes extends Optional<StrataVaultAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class StrataVault extends Model<StrataVaultAttributes, StrataVaultCreationAttributes> implements StrataVaultAttributes {
  public id!: number;
  public profileId!: number;
  public name!: string;
  public path!: string;
  public description!: string | null;
  public repositoryUri!: string | null;
  public currentBranch!: string | null;
  public fossilizesId!: number;
  public artifacts!: string[];
  public strata!: string[];
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

StrataVault.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    profileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'profile_id',
      references: {
        model: 'LithoProfiles',
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'name',
    },
    path: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'path',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'description',
    },
    repositoryUri: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'repository_uri',
    },
    currentBranch: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: 'main',
      field: 'current_branch',
    },
    fossilizesId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'Fossilizes_id',
    },
    artifacts: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      field: 'artifacts',
    },
    strata: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      field: 'strata',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'strata_vaults',
    timestamps: true,
    underscored: true,
  }
);

export default StrataVault;
