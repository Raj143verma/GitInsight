import mongoose from 'mongoose';

const jobMatchSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      default: 'Untitled Job Description',
      trim: true,
    },
    rawText: {
      type: String,
      required: [true, 'Job Description raw text is required'],
    },
    extractedRequirements: [
      {
        technologyKey: {
          type: String,
          required: true,
          trim: true,
        },
        displayName: {
          type: String,
          required: true,
          trim: true,
        },
        category: {
          type: String,
          enum: ['required', 'preferred', 'unspecified'],
          default: 'unspecified',
        },
        recognitionStatus: {
          type: String,
          enum: ['recognized', 'unrecognized'],
          default: 'recognized',
        },
        matchedText: {
          type: String,
          default: '',
        },
        occurrencesCount: {
          type: Number,
          default: 1,
        },
        sampleSnippets: {
          type: [String],
          default: [],
        },
      },
    ],
    summary: {
      totalRequirements: {
        type: Number,
        default: 0,
      },
      requiredCount: {
        type: Number,
        default: 0,
      },
      preferredCount: {
        type: Number,
        default: 0,
      },
      unspecifiedCount: {
        type: Number,
        default: 0,
      },
      matchedCount: {
        type: Number,
        default: 0,
      },
      noEvidenceCount: {
        type: Number,
        default: 0,
      },
      recognizedCount: {
        type: Number,
        default: 0,
      },
      unrecognizedCount: {
        type: Number,
        default: 0,
      },
      matchedRequiredCount: {
        type: Number,
        default: 0,
      },
      matchedPreferredCount: {
        type: Number,
        default: 0,
      },
      coveragePercentage: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

jobMatchSchema.index({ username: 1, createdAt: -1 });

export const JobMatch = mongoose.model('JobMatch', jobMatchSchema);
export default JobMatch;
