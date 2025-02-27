import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Represents a review for a terrain path by an instructor or admin.
 * Used in the quality assurance process for learning paths.
 */
export interface TerrainReviewAttributes {
  id: number;
  pathId: number | null;
  reviewerId: number | null;
  reviewStatus: 'pending' | 'approved' | 'rejected' | null;
  feedback: string | null;
  reviewedAt: Date | null;
}

interface TerrainReviewCreationAttributes extends Optional<TerrainReviewAttributes, 'id'> {}

class TerrainReview extends Model<TerrainReviewAttributes, TerrainReviewCreationAttributes> {
  public id!: number;
  public pathId!: number | null;
  public reviewerId!: number | null;
  public reviewStatus!: 'pending' | 'approved' | 'rejected' | null;
  public feedback!: string | null;
  public reviewedAt!: Date | null;
}

TerrainReview.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
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
    reviewerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'reviewer_id', // Map camelCase to snake_case in database
      references: {
        model: 'LithoProfiles',
        key: 'id',
      },
    },
    reviewStatus: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: true,
      field: 'review_status', // Map camelCase to snake_case in database
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'reviewed_at', // Map camelCase to snake_case in database
    },
  },
  {
    sequelize,
    tableName: 'TerrainReviews',
    timestamps: false, // This table doesn't have standard timestamp fields
  }
);

export default TerrainReview;
