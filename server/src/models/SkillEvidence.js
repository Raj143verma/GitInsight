import mongoose from 'mongoose';

const skillEvidenceSchema = new mongoose.Schema(
  {
    githubId: {
      type: Number,
      required: [true, 'GitHub user ID is required'],
      index: true,
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    technology: {
      type: String,
      required: [true, 'Technology name is required'],
      trim: true,
    },
    technologyKey: {
      type: String,
      required: [true, 'Normalized technology key is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Technology category is required'],
      enum: ['language', 'framework', 'library', 'runtime', 'database', 'tool'],
    },
    evidenceType: {
      type: String,
      required: [true, 'Evidence type is required'],
      enum: ['language', 'dependency', 'repository_metadata', 'file_manifest'],
    },
    source: {
      type: String,
      required: [true, 'Evidence source is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Evidence description is required'],
      trim: true,
    },
    strength: {
      type: String,
      enum: ['direct', 'supporting'],
      default: 'direct',
    },
    githubRepoId: {
      type: Number,
      required: [true, 'GitHub repository ID is required'],
      index: true,
    },
    repositoryName: {
      type: String,
      required: [true, 'Repository name is required'],
      trim: true,
    },
    repositoryFullName: {
      type: String,
      required: [true, 'Repository full name is required'],
      trim: true,
    },
    repositoryUrl: {
      type: String,
      required: [true, 'Repository URL is required'],
    },
    observedAt: {
      type: Date,
      default: Date.now,
    },
    lastObservedAt: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate identical evidence while preserving distinct evidence sources
skillEvidenceSchema.index(
  {
    githubId: 1,
    technologyKey: 1,
    githubRepoId: 1,
    evidenceType: 1,
    source: 1,
  },
  { unique: true }
);

skillEvidenceSchema.index({ username: 1, technologyKey: 1 });
skillEvidenceSchema.index({ username: 1, category: 1 });

export const SkillEvidence = mongoose.model('SkillEvidence', skillEvidenceSchema);
export default SkillEvidence;
