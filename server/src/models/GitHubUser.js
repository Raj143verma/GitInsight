import mongoose from 'mongoose';

const gitHubUserSchema = new mongoose.Schema(
  {
    githubId: {
      type: Number,
      required: [true, 'GitHub ID is required'],
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      default: '',
      trim: true,
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      default: '',
      trim: true,
    },
    company: {
      type: String,
      default: '',
      trim: true,
    },
    location: {
      type: String,
      default: '',
      trim: true,
    },
    blog: {
      type: String,
      default: '',
      trim: true,
    },
    profileUrl: {
      type: String,
      default: '',
    },
    publicReposCount: {
      type: Number,
      default: 0,
    },
    publicGistsCount: {
      type: Number,
      default: 0,
    },
    followersCount: {
      type: Number,
      default: 0,
    },
    followingCount: {
      type: Number,
      default: 0,
    },
    githubCreatedAt: {
      type: Date,
    },
    githubUpdatedAt: {
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

export const GitHubUser = mongoose.model('GitHubUser', gitHubUserSchema);
export default GitHubUser;
