import express from 'express';
import {
  createJob,
  getJobs,
  getJobBySlug,
  updateJob,
  deleteJob,
  retriggerIndexing,
  getJobLogo
} from '../controllers/jobController';

const router = express.Router();

router.post('/', createJob);
router.get('/', getJobs);
router.get('/:slug', getJobBySlug);
router.get('/:slug/logo', getJobLogo);
router.put('/:id', updateJob);
router.delete('/:id', deleteJob);
router.post('/:id/index', retriggerIndexing);

export default router;
