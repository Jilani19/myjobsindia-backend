import mongoose, { Schema, Document } from 'mongoose';

export interface IJob extends Document {
  title: string;
  slug: string;
  company: string;
  companyLogo?: string;
  location: string;
  salary: string;
  description: string;
  employmentType: string;
  experience: string;
  skills: string[];
  industry: string;
  validThrough: Date;
  postedAt: Date;
  applyUrl: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  indexingStatus?: {
    status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'SKIPPED';
    lastSubmittedAt?: Date;
    serviceAccountEmail?: string;
    message?: string;
    indexingType?: string;
  };
  publishingLogs?: {
    message: string;
    timestamp: Date;
    status: 'SUCCESS' | 'FAILED' | 'PENDING';
  }[];
}

const JobSchema: Schema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  company: { type: String, required: true },
  companyLogo: { type: String },
  location: { type: String, required: true },
  salary: { type: String, required: true },
  description: { type: String, required: true },
  employmentType: { type: String, required: true },
  experience: { type: String, required: true },
  skills: { type: [String], required: true },
  industry: { type: String, required: true },
  validThrough: { type: Date, required: true },
  postedAt: { type: Date, default: Date.now },
  applyUrl: { type: String, required: false },
  status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], default: 'DRAFT' },
  indexingStatus: {
    status: { type: String, enum: ['SUCCESS', 'FAILED', 'PENDING', 'SKIPPED'], default: 'PENDING' },
    lastSubmittedAt: { type: Date },
    serviceAccountEmail: { type: String },
    message: { type: String },
    indexingType: { type: String }
  },
  publishingLogs: [{
    message: { type: String },
    timestamp: { type: Date, default: Date.now },
    status: { type: String, enum: ['SUCCESS', 'FAILED', 'PENDING'] }
  }]
}, {
  timestamps: true
});

export default mongoose.model<IJob>('Job', JobSchema);
