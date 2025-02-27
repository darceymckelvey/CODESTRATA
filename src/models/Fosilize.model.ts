import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Represents a version control commit (fossilize) in the system.
 * Each fossil is a snapshot of code changes with metadata.
 */
export interface FossilizeAttributes {
  id: number;
  vaultId: number | null;
  commitHash: string | null;
  message: string | null;
  committedAt: Date | null;
}

interface FossilizeCreationAttributes extends Optional<FossilizeAttributes, 'id'> {}

class Fossilize extends Model<FossilizeAttributes, FossilizeCreationAttributes> {
  public id!: number;
  public vaultId!: number | null;
  public commitHash!: string | null;
  public message!: string | null;
  public committedAt!: Date | null;
}

Fossilize.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    vaultId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'vault_id', // Map camelCase to snake_case in database
      references: {
        model: 'strata_vaults',
        key: 'id',
      },
    },
    commitHash: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'commit_hash', // Map camelCase to snake_case in database
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    committedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'commited_at', // Note: the DB column appears to have a typo (one 't'), retaining for compatibility
    },
  },
  {
    sequelize,
    tableName: 'Fossilizes', // Keeping original table name for DB compatibility
    timestamps: false, // This table doesn't have standard timestamp fields
  }
);

export default Fossilize;
