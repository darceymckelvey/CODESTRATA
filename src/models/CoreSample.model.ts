import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Represents a learning exercise (core sample) that is part of a terrain path.
 * Each core sample includes instructions and starter code for users.
 */
export interface CoreSampleAttributes {
  id: number;
  layerId: number | null;
  title: string | null;
  instructions: string | null;
  starterCode: string | null;
  points: number | null;
  createdAt: Date | null;
}

interface CoreSampleCreationAttributes extends Optional<CoreSampleAttributes, 'id'> {}

class CoreSample extends Model<CoreSampleAttributes, CoreSampleCreationAttributes> {
  public id!: number;
  public layerId!: number | null;
  public title!: string | null;
  public instructions!: string | null;
  public starterCode!: string | null;
  public points!: number | null;
  public createdAt!: Date | null;
}

CoreSample.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    layerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'layer_id', // Map camelCase to snake_case in database
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    starterCode: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'starter_code', // Map camelCase to snake_case in database
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'created_at', // Map camelCase to snake_case in database
    },
  },
  {
    sequelize,
    tableName: 'CoreSamples',
    timestamps: false, // This table doesn't have standard timestamp fields
  }
);

export default CoreSample;
