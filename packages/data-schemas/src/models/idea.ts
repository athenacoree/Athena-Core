import { Model } from 'mongoose';
import type { IIdea } from '~/types';
import ideaSchema from '~/schema/idea';

export function createIdeaModel(mongoose: typeof import('mongoose')): Model<IIdea> {
  return mongoose.models.Idea || mongoose.model<IIdea>('Idea', ideaSchema);
}
