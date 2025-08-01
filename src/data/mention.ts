import { Schema, model } from 'mongoose';

export interface MergeRequestSlackMention {
  createdAt: Date

  mergeRequestId: string,
  mergeRequestLink: string,
  mergeRequestProjectPath: string,

  slackMessageTimeStamp: string,
  slackMessageChannel: string,

  linkUnfurled?: boolean,
  linkUnfurlAddedAt?: Date,
  linkUnfurlUpdatedAt?: Date,
};

export const mergeRequestSlackMentionSchema = new Schema<MergeRequestSlackMention>({
  createdAt: { type: Date, required: true },

  mergeRequestId: { type: String, required: true },
  mergeRequestLink: { type: String, required: true },
  mergeRequestProjectPath: { type: String, required: true },

  slackMessageTimeStamp: { type: String, required: true },
  slackMessageChannel: { type: String, required: true },

  linkUnfurled: { type: Boolean, required: false },
  linkUnfurlAddedAt: { type: Date, required: false },
  linkUnfurlUpdatedAt: { type: Date, required: false },
});

mergeRequestSlackMentionSchema.index({ mergeRequestProjectPath: 1, mergeRequestId: 1, slackMessageTimeStamp: 1 })
mergeRequestSlackMentionSchema.index({ mergeRequestLink: 1, slackMessageTimeStamp: 1 }, { unique: true })

export const MergeRequestSlackMentionModel = model<MergeRequestSlackMention>('MergeRequestSlackMention', mergeRequestSlackMentionSchema);
export default MergeRequestSlackMentionModel;