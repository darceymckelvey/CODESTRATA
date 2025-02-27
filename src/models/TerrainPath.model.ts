import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Represents a learning path (terrain) that users can follow.
 * Each terrain path contains exercises and tracks progress.
 */
export interface TerrainPathAttributes {
  id: number;
  creatorId: number | null;
  name: string | null;
  description: string | null;
  isActive: boolean | null;
  isPublic: boolean | null;
  createdAt: Date | null;
  terrainReviewsId: number | null; // Following JavaScript naming conventions
}

interface TerrainPathCreationAttributes extends Optional<TerrainPathAttributes, 'id'> {}

class TerrainPath extends Model<TerrainPathAttributes, TerrainPathCreationAttributes> {
  public id!: number;
  public creatorId!: number | null;
  public name!: string | null;
  public description!: string | null;
  public isActive!: boolean | null;
  public isPublic!: boolean | null;
  public createdAt!: Date | null;
  public terrainReviewsId!: number | null;
}

TerrainPath.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    creatorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'creator_id', // Map camelCase to snake_case in database
      references: {
        model: 'LithoProfiles',
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT('medium'),
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'is_active', // Map camelCase to snake_case in database
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'is_public', // Map camelCase to snake_case in database
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'created_at', // Map camelCase to snake_case in database
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
  },
  {
    sequelize,
    tableName: 'TerrainPaths',
    timestamps: false, // This table uses created_at instead of standard timestamp fields
  }
);

export default TerrainPath;
