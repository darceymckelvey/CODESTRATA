import CoreSample from './CoreSample.model';
import Fosilize from './Fosilize.model';
import LithoProfile from './LithoProfile.model';
import StrataVault from './StrataVault.model';
import TerrainPath from './TerrainPath.model';
import TerrainProgress from './TerrainProgress.model';
import TerrainReview from './TerrainReview.model';

// Define model associations
LithoProfile.hasMany(StrataVault, {
  foreignKey: 'profile_id',
  as: 'vaults',
  onDelete: 'NO ACTION',
  onUpdate: 'CASCADE'
});

StrataVault.belongsTo(LithoProfile, {
  foreignKey: 'profile_id',
  as: 'owner',
  onDelete: 'NO ACTION', 
  onUpdate: 'CASCADE'
});

StrataVault.hasMany(Fosilize, {
  foreignKey: 'vault_id',
  as: 'fosilizes',
  onDelete: 'NO ACTION',
  onUpdate: 'CASCADE'
});

Fosilize.belongsTo(StrataVault, {
  foreignKey: 'vault_id',
  as: 'vault',
  onDelete: 'NO ACTION', 
  onUpdate: 'CASCADE'
});

LithoProfile.hasMany(TerrainPath, {
  foreignKey: 'creator_id',
  as: 'createdPaths',
  onDelete: 'NO ACTION',
  onUpdate: 'CASCADE'
});

TerrainPath.belongsTo(LithoProfile, {
  foreignKey: 'creator_id',
  as: 'creator',
  onDelete: 'NO ACTION', 
  onUpdate: 'CASCADE'
});

TerrainPath.belongsTo(TerrainReview, {
  foreignKey: 'TerrainReviews_id',
  as: 'review',
  onDelete: 'NO ACTION', 
  onUpdate: 'CASCADE'
});

TerrainReview.hasOne(TerrainPath, {
  foreignKey: 'TerrainReviews_id',
  as: 'path',
  onDelete: 'NO ACTION',
  onUpdate: 'CASCADE'
});

LithoProfile.hasMany(TerrainReview, {
  foreignKey: 'reviewer_id',
  as: 'reviews',
  onDelete: 'NO ACTION',
  onUpdate: 'CASCADE'
});

TerrainReview.belongsTo(LithoProfile, {
  foreignKey: 'reviewer_id',
  as: 'reviewer',
  onDelete: 'NO ACTION', 
  onUpdate: 'CASCADE'
});

LithoProfile.hasMany(TerrainProgress, {
  foreignKey: 'profile_id',
  as: 'progress',
  onDelete: 'NO ACTION',
  onUpdate: 'CASCADE'
});

TerrainProgress.belongsTo(LithoProfile, {
  foreignKey: 'profile_id',
  as: 'profile',
  onDelete: 'NO ACTION', 
  onUpdate: 'CASCADE'
});

TerrainPath.hasMany(TerrainProgress, {
  foreignKey: 'path_id',
  as: 'enrollments',
  onDelete: 'NO ACTION',
  onUpdate: 'CASCADE'
});

TerrainProgress.belongsTo(TerrainPath, {
  foreignKey: 'path_id',
  as: 'path',
  onDelete: 'NO ACTION', 
  onUpdate: 'CASCADE'
});

export {
  CoreSample,
  Fosilize,
  LithoProfile,
  StrataVault,
  TerrainPath,
  TerrainProgress,
  TerrainReview,
};

export default {
  CoreSample,
  Fosilize,
  LithoProfile,
  StrataVault,
  TerrainPath,
  TerrainProgress,
  TerrainReview,
};
