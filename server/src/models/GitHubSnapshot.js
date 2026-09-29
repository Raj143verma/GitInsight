import mongoose from 'mongoose';

const gitHubSnapshotSchema = new mongoose.Schema(
  {
    githubId: {
      type: Number,
      required: [true, 'GitHub ID is required'],
      index: true,
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      lowercase: true,
      trim: true,
      index: true,
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
    profileMetrics: {
      publicReposCount: { type: Number, default: 0 },
      publicGistsCount: { type: Number, default: 0 },
      followersCount: { type: Number, default: 0 },
      followingCount: { type: Number, default: 0 },
    },
    repositoryMetrics: {
      totalRepositories: { type: Number, default: 0 },
      totalStars: { type: Number, default: 0 },
      totalForks: { type: Number, default: 0 },
      totalWatchers: { type: Number, default: 0 },
      totalOpenIssues: { type: Number, default: 0 },
      totalSize: { type: Number, default: 0 },
      forkedReposCount: { type: Number, default: 0 },
      archivedReposCount: { type: Number, default: 0 },
      primaryLanguageBreakdown: {
        type: Map,
        of: Number,
        default: {},
      },
    },
    languagesAggregate: {
      type: Map,
      of: Number,
      default: {},
    },
    activityMetrics: {
      publicEventsCount: { type: Number, default: 0 },
      recentEventsByType: {
        type: Map,
        of: Number,
        default: {},
      },
      dataAvailability: {
        eventsWindow: { type: String, default: 'last_300_public_events_or_90_days' },
        isCompleteHistory: { type: Boolean, default: false },
        privateActivityIncluded: { type: Boolean, default: false },
        notes: {
          type: String,
          default:
            'Represents observable public activity from GitHub REST API. Private contributions and older commits are restricted by GitHub public scope.',
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

// Unique constraint per user per calendar day (UTC)
gitHubSnapshotSchema.index({ githubId: 1, snapshotDate: 1 }, { unique: true });
gitHubSnapshotSchema.index({ username: 1, snapshotDate: -1 });

export const GitHubSnapshot = mongoose.model('GitHubSnapshot', gitHubSnapshotSchema);
export default GitHubSnapshot;
