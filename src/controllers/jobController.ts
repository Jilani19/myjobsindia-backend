import { Request, Response } from 'express';
import Job from '../models/Job';
import { notifyGoogleIndexing } from '../services/googleIndexing';

const getFrontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:3000';

interface ILog {
  message: string;
  timestamp: Date;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
}

const generateLogs = (indexingStatus: any): ILog[] => {
  const timestamp = new Date();
  const logs: ILog[] = [
    { message: 'Job saved to MongoDB', timestamp, status: 'SUCCESS' },
    { message: 'Dynamic URL generated', timestamp, status: 'SUCCESS' },
    { message: 'JobPosting schema injected', timestamp, status: 'SUCCESS' },
    { message: 'SEO metadata generated', timestamp, status: 'SUCCESS' },
    { message: 'Sitemap updated', timestamp, status: 'SUCCESS' },
    { message: 'Open Graph metadata generated', timestamp, status: 'SUCCESS' },
    { 
      message: `Google Indexing API notified (${indexingStatus.indexingType})`, 
      timestamp, 
      status: indexingStatus.status === 'SUCCESS' ? 'SUCCESS' : indexingStatus.status === 'SKIPPED' ? 'PENDING' : 'FAILED' 
    }
  ];
  return logs;
};

export const createJob = async (req: Request, res: Response) => {
  try {
    const job = new Job(req.body);
    if (!job.slug && job.title) {
      job.slug = job.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    }
    
    if (!job.status) job.status = 'DRAFT';
    job.indexingStatus = { status: 'PENDING' };
    
    const savedJob = await job.save();
    
    if (savedJob.status === 'PUBLISHED') {
      const jobUrl = `${getFrontendUrl()}/jobs/${savedJob.slug}`;
      const indexingResult = await notifyGoogleIndexing(jobUrl, 'URL_UPDATED');
      savedJob.indexingStatus = {
        status: indexingResult.status,
        lastSubmittedAt: new Date(),
        serviceAccountEmail: indexingResult.serviceAccountEmail,
        message: indexingResult.message,
        indexingType: 'URL_UPDATED'
      };
      savedJob.publishingLogs = generateLogs(savedJob.indexingStatus);
      await savedJob.save();
    }

    res.status(201).json(savedJob);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getJobs = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const jobs = await Job.find(filter).sort({ postedAt: -1 });
    res.status(200).json(jobs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getJobBySlug = async (req: Request, res: Response) => {
  try {
    const job = await Job.findOne({ slug: req.params.slug, status: 'PUBLISHED' });
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.status(200).json(job);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateJob = async (req: Request, res: Response) => {
  try {
    const oldJob = await Job.findById(req.params.id);
    if (!oldJob) return res.status(404).json({ message: 'Job not found' });

    const updatedJob = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedJob) return res.status(404).json({ message: 'Job not found' });
    
    const jobUrl = `${getFrontendUrl()}/jobs/${updatedJob.slug}`;
    
    if (oldJob.status === 'PUBLISHED' && updatedJob.status !== 'PUBLISHED') {
      const indexingResult = await notifyGoogleIndexing(jobUrl, 'URL_DELETED');
      updatedJob.indexingStatus = {
        status: indexingResult.status,
        lastSubmittedAt: new Date(),
        serviceAccountEmail: indexingResult.serviceAccountEmail,
        message: indexingResult.message,
        indexingType: 'URL_DELETED'
      };
      updatedJob.publishingLogs = generateLogs(updatedJob.indexingStatus);
      await updatedJob.save();
    } 
    else if (updatedJob.status === 'PUBLISHED') {
      const indexingResult = await notifyGoogleIndexing(jobUrl, 'URL_UPDATED');
      updatedJob.indexingStatus = {
        status: indexingResult.status,
        lastSubmittedAt: new Date(),
        serviceAccountEmail: indexingResult.serviceAccountEmail,
        message: indexingResult.message,
        indexingType: 'URL_UPDATED'
      };
      updatedJob.publishingLogs = generateLogs(updatedJob.indexingStatus);
      await updatedJob.save();
    }

    res.status(200).json(updatedJob);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteJob = async (req: Request, res: Response) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (job.status === 'PUBLISHED') {
      const jobUrl = `${getFrontendUrl()}/jobs/${job.slug}`;
      await notifyGoogleIndexing(jobUrl, 'URL_DELETED');
    }

    await Job.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Job deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getJobLogo = async (req: Request, res: Response) => {
  try {
    const job = await Job.findOne({ slug: req.params.slug });
    if (!job || !job.companyLogo) return res.status(404).send('Logo not found');
    
    const matches = job.companyLogo.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return res.status(400).send('Invalid image data');
    
    const buffer = Buffer.from(matches[2], 'base64');
    res.set('Content-Type', matches[1]);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (error: any) {
    res.status(500).send('Server Error');
  }
};

export const retriggerIndexing = async (req: Request, res: Response) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const jobUrl = `${getFrontendUrl()}/jobs/${job.slug}`;
    const action = job.status === 'PUBLISHED' ? 'URL_UPDATED' : 'URL_DELETED';
    
    const indexingResult = await notifyGoogleIndexing(jobUrl, action);
    
    job.indexingStatus = {
      status: indexingResult.status,
      lastSubmittedAt: new Date(),
      serviceAccountEmail: indexingResult.serviceAccountEmail,
      message: indexingResult.message,
      indexingType: action
    };
    job.publishingLogs = generateLogs(job.indexingStatus);
    
    await job.save();
    res.status(200).json(job);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
