import mongoose from 'mongoose';

const gitHubRepositorySchema = new mongoose.Schema(
  {
    githubRepoId: {
      type: Number,
      required: [true, 'GitHub Repository ID is required'],
      unique: true,
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
    description: {
      type: String,
      default: '',
      trim: true,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    isFork: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    primaryLanguage: {
      type: String,
      default: 'Unknown',
      index: true,
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
    defaultBranch: {
      type: String,
      default: 'main',
    },
    htmlUrl: {
      type: String,
      default: '',
    },
    homepage: {
      type: String,
      default: '',
      trim: true,
    },
    size: {
      type: Number,
      default: 0,
    },
    topics: {
      type: [String],
      default: [],
    },
    license: {
      key: { type: String, default: null },
      name: { type: String, default: null },
      spdxId: { type: String, default: null },
    },
    hasReadme: {
      type: Boolean,
      default: null,
    },
    languages: {
      type: Map,
      of: Number,
      default: {},
    },
    githubCreatedAt: {
      type: Date,
    },
    githubUpdatedAt: {
      type: Date,
    },
    githubPushedAt: {
      type: Date,
    },
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

gitHubRepositorySchema.index({ ownerUsername: 1, name: 1 });

export const GitHubRepository = mongoose.model('GitHubRepository', gitHubRepositorySchema);
export default GitHubRepository;
