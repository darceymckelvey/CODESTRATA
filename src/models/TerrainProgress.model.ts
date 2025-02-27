import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Represents a user's progress through a terrain path.
 * Tracks which layer/level they've reached in their learning journey.
 */
export interface TerrainProgressAttributes {
  id: number;
  profileId: number | null;
  pathId: number | null;
  currentLayer: number | null;
  enrolledAt: Date | null;
}

interface TerrainProgressCreationAttributes extends Optional<TerrainProgressAttributes, 'id'> {}

class TerrainProgress extends Model<TerrainProgressAttributes, TerrainProgressCreationAttributes> {
  public id!: number;
  public profileId!: number | null;
  public pathId!: number | null;
  public currentLayer!: number | null;
  public enrolledAt!: Date | null;
}

TerrainProgress.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    profileId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'profile_id', // Map camelCase to snake_case in database
      references: {
        model: 'LithoProfiles',
        key: 'id',
      },
    },
    pathId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'path_id', // Map camelCase to snake_case in database
      references: {
        model: 'TerrainPaths',
        key: 'id',
      },
    },
    currentLayer: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'current_layer', // Map camelCase to snake_case in database
    },
    enrolledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'enrolled_at', // Map camelCase to snake_case in database
    },
  },
  {
    sequelize,
    tableName: 'TerrainProgress',
    timestamps: false, // This table doesn't have standard timestamp fields
  }
);

export default TerrainProgress;
