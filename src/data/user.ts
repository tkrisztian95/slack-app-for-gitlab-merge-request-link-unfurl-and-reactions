import { Schema, model } from 'mongoose';
import { GitLabUser } from '../gitlab/index.js'

export interface SlackAppUser {
  id: string,
  username: string,
  createdAt: Date,
  gitlabUser: GitLabUser
  // Preferences
  // On reaction added
  autoAssignAsReviewer?: boolean,
  // On link shared
  autoAssignAsAssignee?: boolean
}

export const GitLabUserSchema = new Schema<GitLabUser>({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true }
});

export const SlackAppUserSchema = new Schema<SlackAppUser>({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  createdAt: { type: Date, required: true, default: Date.now },
  gitlabUser: { type: GitLabUserSchema, required: true },
  autoAssignAsReviewer: { type: Boolean, required: false },
  autoAssignAsAssignee: { type: Boolean, required: false },
});


SlackAppUserSchema.index({ id: 1, "gitlabUser.id": 1 }, { unique: true })

export const SlackAppUserModel = model<SlackAppUser>('SlackAppUser', SlackAppUserSchema);
export default SlackAppUserModel;

