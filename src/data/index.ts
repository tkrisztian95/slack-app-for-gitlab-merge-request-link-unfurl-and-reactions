import { MergeRequestSlackMention, MergeRequestSlackMentionModel } from './mention.js'
import SlackAppUserModel, { SlackAppUser } from './user.js';

export const findAllMentions = () => {
  return MergeRequestSlackMentionModel.find();
}

export const findAllMentionsOfMergeRequest = (mrId: string, mrProjectPath: string) => {
  return MergeRequestSlackMentionModel.find({ mergeRequestId: mrId, mergeRequestProjectPath: mrProjectPath });
}

export const findMentionByMessage = (messageTs: string) => {
  return MergeRequestSlackMentionModel.findOne({ slackMessageTimeStamp: messageTs });
}

export const createMention = (mention: MergeRequestSlackMention) => {
  return MergeRequestSlackMentionModel.create(mention);
}

export const deleteMentionsCreatedBefore = (date: Date): Promise<{ deletedCount: number }> => {
  return MergeRequestSlackMentionModel.deleteMany({ createdAt: { $lt: date } })
}

export const findUser = (slackUserId: string) => {
  return SlackAppUserModel.findOne({ id: slackUserId });
}

export const createUser = (user: SlackAppUser) => {
  return SlackAppUserModel.create(user);
}