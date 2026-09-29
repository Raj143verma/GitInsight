import mongoose from 'mongoose';

const gitHubRepositorySnapshotSchema = new mongoose.Schema(
  {
    githubRepoId: {
      type: Number,
      required: [true, 'GitHub Repository ID is required'],
      index: true,
    },
    ownerUsername: {
      type: String,
      required: [true, 'Owner username is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Repository name is required'],
      trim: true,
    },
    fullName: {
      type: String,
      required: [true, 'Repository full name is required'],
      trim: true,
    },
    snapshotDate: {
      type: String,
      required: [true, 'Snapshot date (YYYY-MM-DD) is required'],
      index: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    stargazersCount: {
      type: Number,
      default: 0,
    },
    forksCount: {
      type: Number,
      default: 0,
    },
    watchersCount: {
      type: Number,
      default: 0,
    },
    openIssuesCount: {
      type: Number,
      default: 0,
    },
    size: {
      type: Number,
      default: 0,
    },
    primaryLanguage: {
      type: String,
      default: 'Unknown',
    },
    languages: {
      type: Map,
      of: Number,
      default: {},
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    isFork: {
      type: Boolean,
      default: false,
    },
    githubPushedAt: {
      type: Date,
    },
    topics: {
      type: [String],
      default: [],
    },
    licenseKey: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Unique constraint per repository per calendar day (UTC)
gitHubRepositorySnapshotSchema.index({ githubRepoId: 1, snapshotDate: 1 }, { unique: true });
gitHubRepositorySnapshotSchema.index({ ownerUsername: 1, name: 1, snapshotDate: -1 });

export const GitHubRepositorySnapshot = mongoose.model(
  'GitHubRepositorySnapshot',
  gitHubRepositorySnapshotSchema
);
export default GitHubRepositorySnapshot;
