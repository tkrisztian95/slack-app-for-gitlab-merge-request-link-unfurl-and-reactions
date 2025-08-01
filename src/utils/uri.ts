/**
 * Removes trailing slash from URI
 * Example: example.com/api/ -> example.com/api
 * @param {string} uri URI string
 * @return {string} URI string without trailing slash
 */
export const removeTrailingSlash = (uri: string): string => {
  return uri.charAt(uri.length - 1) === '/' ? uri.slice(0, -1) : uri;
};

/**
 * Extract a merge request project id and path from web url
 * @param {String} linkStr Merge request web url
 * @return {Object} {mergeRequestID, projectPath}
 */
export const extractMergeRequestAndProjectIdFromGitLabWebUrl = (linkStr: string) => {
  const regexp = new RegExp(
    '(?:http[s]?://)(?:gitlab.com/)?([^\\s]+/.*)?(?:-/merge_requests/)(\\d+)$',
    'g',
  );

  const regexGroups = { GroupsAndProjects: 1, MR_ID: 2 };
  const match = regexp.exec(linkStr);

  if (match && match.length == 3) {
    const mergeRequestID = match[regexGroups.MR_ID];
    const projectPath = removeTrailingSlash(
      match[regexGroups.GroupsAndProjects],
    );

    return {
      mergeRequestID: mergeRequestID,
      projectPath: projectPath,
      mergeRequestProjectPathUriEncoded: encodeURIComponent(
        projectPath, // Encoding '/' char to '%2F'
      )
    };
  }

  return null;
}
