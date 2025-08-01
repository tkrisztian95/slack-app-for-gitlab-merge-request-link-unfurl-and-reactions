import got from 'got';

import logger from '../utils/logger.js';

const BASE_URL = `https://gitlab.com/api/v4`;

export interface GitLabUser {
  id: number,
  name: string,
  username: string
}

export interface MergeRequestDetails {
  title: string,
  author: GitLabUser,
  state: string, // merged |
  head_pipeline_id: number,
  draft: boolean,
  work_in_progress: boolean,
  created_at: Date,
  updated_at: Date,
  merge_status: string,
  detailed_merge_status: string,
  changes_count: number,
  reviewers: Array<GitLabUser>,
  assignees: Array<GitLabUser>
}

export interface MergeRequestHook {
  object_kind: string,
  event_type: string,
  object_attributes: {
    iid: string, //number
    author_id: string,
    action: string,
    state: string, // merged | 
  }
  project: {
    path_with_namespace: string
  },
  changes: {
    reviewers: {
      previous: Array<GitLabUser>,
      current: Array<GitLabUser>
    },
    assignees: {
      previous: Array<GitLabUser>,
      current: Array<GitLabUser>
    }
  }
}

/**
 * Get a merge request basic details
 * @param {String} projectPathOrId
 * @param {String} iid
 */
export const fetchMergeRequestDetails = async (projectPathOrId: (string | number), iid: (string | number)): Promise<MergeRequestDetails | undefined> => {
  const uri = `${BASE_URL}/projects/${projectPathOrId}/merge_requests/${iid}`;
  logger.debug(`Sending GL get MR request at ${uri}`);

  try {
    const response = await got(uri, {
      method: 'GET',
      headers: {
        'PRIVATE-TOKEN': process.env.GITLAB_PRIVATE_TOKEN,
      },
    });

    if (response.statusCode !== 200) {
      logger.warn(
        `Could not get MR. Server responded with status code '${response.statusCode}'`,
      );
      return;
    }
    logger.debug(
      `Successfully get MR at web url: ${uri}`,
    );

    const mrObj: MergeRequestDetails = JSON.parse(response.body);
    return mrObj;
  } catch (error) {
    logger.error(error);
  }
}

/**
   * Get a project member's userid based on username
   * @param {String} projectID GitLab project id
   * @param {String} username GutLab user username
   * @return {string} GitLab user user id
   */
export const findProjectMemberByUsername = async (projectID: string, username: string): Promise<GitLabUser | undefined> => {
  const uri = `${BASE_URL}/projects/${projectID}/members/all?query=${username}`;
  logger.debug(`Sending GL get request at ${uri}`);
  try {
    const response = await got(uri, {
      method: 'GET',
      headers: {
        'PRIVATE-TOKEN': process.env.GITLAB_PRIVATE_TOKEN,
      },
    });

    if (response.statusCode !== 200) {
      logger.warn(
        `Could not get project members. Server responded with status code '${response.statusCode}'`,
      );
    }

    logger.debug(response.body);
    if (response.body.length == 0) {
      logger.warn(
        `Could not found GL user id for username '${username}'`,
      );
      return;
    }

    const json: Array<GitLabUser> = JSON.parse(response.body);

    if (json.length > 0) {
      logger.warn(
        `There were mutliple user matches for username '${username}' among the project ${projectID} members!`,
      );
    }

    const userID = json[0].id;
    logger.debug(
      `Successfully found GL user id '${userID}' for username '${username}'`,
    );
    return json[0];
  } catch (error) {
    logger.error(error);
  }
};

/**
 * Assign user as reviewer by user id
 * When the user is already among the reviewers do nothing.
 * @param {String} projectID GitLab project id
 * @param {String} mergeRequestID GitLab merge request id
 * @param {String} userID GitLab user user id
 */
export const assignAsReviewer = async (projectID: string, mergeRequestID: string, userID: number): Promise<boolean> => {
  const reviewers = await fetchMergeRequestDetails(
    projectID,
    mergeRequestID,
  ).then((mrObj) => mrObj?.reviewers.map(u => u.id));

  if (reviewers) {
    if (reviewers.includes(userID)) {
      logger.debug('Skip assignAsReviewer due to user already in the reviewers!');
      return false;
    }

    reviewers.push(userID);
    const uniqueReviewers = reviewers.filter((value, index, array) => array.indexOf(value) === index);

    const uri = `${BASE_URL}/projects/${projectID}/merge_requests/${mergeRequestID}`;
    logger.debug(`Sending GL update MR reviewers request at ${uri}`);
    try {
      const response = await got(uri, {
        method: 'PUT',
        headers: {
          'PRIVATE-TOKEN': process.env.GITLAB_PRIVATE_TOKEN,
        },
        json: {
          reviewer_ids: uniqueReviewers,
        },
      });

      if (response.statusCode !== 200) {
        logger.warn(

          `Could not update reviewers on MR. Server responded with status code '${response.statusCode}'`,
        );
        return false;
      }

      logger.debug(

        `Successfully updated assigned reviewers on MR: ${uri}`,
      );

      return true;
    } catch (error) {
      logger.error(error);
    }
  }

  return false;
};

export const unassignFromReviewers = async (projectID: string, mergeRequestID: string, userID: number): Promise<boolean> => {
  let reviewers = await fetchMergeRequestDetails(
    projectID,
    mergeRequestID,
  ).then((mrObj) => mrObj?.reviewers.map(u => u.id));

  if (reviewers) {

    if (!reviewers.includes(userID)) {
      logger.debug(`Skip unassignFromReviewers becasue the user ${userID} is not in the reviewers ${reviewers}!`);
      return false;
    }

    reviewers = reviewers.filter(id => id !== userID)
    const uniqueReviewers = reviewers.filter((value, index, array) => array.indexOf(value) === index);

    const uri = `${BASE_URL}/projects/${projectID}/merge_requests/${mergeRequestID}`;
    logger.debug(`Sending GL update MR reviewers request at ${uri}`);
    try {
      const response = await got(uri, {
        method: 'PUT',
        headers: {
          'PRIVATE-TOKEN': process.env.GITLAB_PRIVATE_TOKEN,
        },
        json: {
          reviewer_ids: uniqueReviewers,
        },
      });

      if (response.statusCode !== 200) {
        logger.warn(`Could not update reviewers on MR. Server responded with status code '${response.statusCode}'`);
        return false;
      }

      logger.debug(
        `Successfully updated assigned reviewers on MR: ${uri}`,
      );

      return true;
    } catch (error) {
      logger.error(error);
    }
  }

  return false;
};

export const assignAsAssignee = async (projectID: string, mergeRequestID: string, userID: number): Promise<boolean> => {
  const assignees = await fetchMergeRequestDetails(
    projectID,
    mergeRequestID,
  ).then((mrObj) => mrObj?.assignees.map(u => u.id));

  if (assignees) {
    if (assignees.includes(userID)) {
      logger.debug('Skip assignAsAssignee due to user already in the assignees!');
      return false;
    }

    assignees.push(userID);
    const uniqueAssignees = assignees.filter((value, index, array) => array.indexOf(value) === index);

    const uri = `${BASE_URL}/projects/${projectID}/merge_requests/${mergeRequestID}`;
    logger.debug(`Sending GL update MR assignee request at ${uri}`);
    try {
      const response = await got(uri, {
        method: 'PUT',
        headers: {
          'PRIVATE-TOKEN': process.env.GITLAB_PRIVATE_TOKEN,
        },
        json: {
          assignee_ids: uniqueAssignees,
        },
      });

      if (response.statusCode !== 200) {
        logger.warn(
          `Could not update assignee on MR. Server responded with status code '${response.statusCode}'`,
        );
        return false;
      }

      logger.debug(
        `Successfully updated assigned assignee on MR: ${uri}`,
      );

      return true;
    } catch (error) {
      logger.error(error);
    }
  }

  return false;
};

export default { getMergeRequestDetails: fetchMergeRequestDetails, findProjectMemberIdByUsername: findProjectMemberByUsername, assignAsReviewer }

