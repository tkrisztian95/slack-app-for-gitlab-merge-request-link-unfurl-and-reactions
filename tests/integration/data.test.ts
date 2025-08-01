import * as dataStore from "../../src/data/index";
import mongoose from "mongoose";
import SlackAppUserModel from "../../src/data/user";
import MergeRequestSlackMentionModel from "../../src/data/mention";

describe("testing data store", () => {
  beforeAll(async () => {
    await mongoose.connect("mongodb://localhost:32768/test");
  });

  afterAll((done) => {
    SlackAppUserModel.collection.drop();
    MergeRequestSlackMentionModel.collection.drop();
    // Closing the DB connection allows Jest to exit successfully.
    mongoose.connection.close();
    done();
  });

  test("create and find user by slack user id", async () => {
    const user = {
      id: "123",
      username: "testCreateAndFind",
      createdAt: new Date(),
      gitlabUser: {
        id: "321",
        name: "test",
        username: "123",
      },
    };
    const created = await dataStore.createUser(user);
    const found = await dataStore.findUser("123");
    if (!found) {
      fail();
    }
    expect(created.toObject()).toMatchObject(found.toObject());
  });

  test("cannot create user duplicate", async () => {
    const user = {
      id: "1234",
      username: "testDuplicate",
      createdAt: new Date(),
      gitlabUser: {
        id: "4321",
        name: "test",
        username: "1234",
      },
    };
    await expect(dataStore.createUser(user)).resolves.not.toThrow();
    await expect(dataStore.createUser(user)).rejects.toThrow();
  });

  test("cannot create user with duplicate gitlab user id", async () => {
    const user1 = {
      id: "12341", // Same
      username: "testDuplicate1",
      createdAt: new Date(),
      gitlabUser: {
        id: "43211", // Duplicate
        name: "test111",
        username: "Test 111",
      },
    };
    const user2 = {
      id: "12341", // Same
      username: "testDuplicate2",
      createdAt: new Date(),
      gitlabUser: {
        id: "43211", // Duplicate
        name: "test112",
        username: "Test 222",
      },
    };
    await expect(dataStore.createUser(user1)).resolves.not.toThrow();
    await expect(dataStore.createUser(user2)).rejects.toThrow();
  });

  test("cannot create user with duplicate gitlab user id 2", async () => {
    // Assuming there are two different Slack users bound to the same GitLab user
    const user1 = {
      id: "12342", // Different
      username: "testDuplicate11",
      createdAt: new Date(),
      gitlabUser: {
        id: "432112",
        name: "test1112",
        username: "Test 1112",
      },
    };
    const user2 = {
      id: "12343", // Different
      username: "testDuplicate22",
      createdAt: new Date(),
      gitlabUser: {
        id: "432112",
        name: "test1112",
        username: "Test 1112",
      },
    };
    await expect(dataStore.createUser(user1)).resolves.not.toThrow();
    await expect(dataStore.createUser(user2)).rejects.toThrow();
  });

  test("create and find mention by message", async () => {
    const mention = {
      createdAt: new Date(),
      mergeRequestId: "12",
      mergeRequestLink:
        "https://gitlab.com/api/v4/projects/techcorp%2Fplatform%2Fdev%2Fslack-integration-tool/merge_requests/12",
      mergeRequestProjectPath:
        "techcorp%2Fplatform%2Fdev%2Fslack-integration-tool",
      mergeRequestProjectPathEncoded:
        "techcorp/platform/dev/slack-integration-tool",
      slackMessageTimeStamp: "12345",
      slackMessageChannel: "C12RD4RK9CK",
    };
    const created = await dataStore.createMention(mention);
    const found = await dataStore.findMentionByMessage("12345");
    if (!found) {
      fail();
    }
    expect(created.toObject()).toMatchObject(found.toObject());
  });

  test("find all mentions by merge request id and project path", async () => {
    const mention1 = {
      createdAt: new Date(),
      mergeRequestId: "11",
      mergeRequestLink:
        "https://gitlab.com/api/v4/projects/techcorp%2Fplatform%2Fdev%2Fslack-integration-tool/merge_requests/11",
      mergeRequestProjectPath:
        "techcorp%2Fplatform%2Fdev%2Fslack-integration-tool",
      mergeRequestProjectPathEncoded:
        "techcorp/platform/dev/slack-integration-tool",
      slackMessageTimeStamp: "123451",
      slackMessageChannel: "C12RD4RK9CK",
    };
    await dataStore.createMention(mention1);
    const mention2 = {
      createdAt: new Date(),
      mergeRequestId: "11",
      mergeRequestLink:
        "https://gitlab.com/api/v4/projects/techcorp%2Fplatform%2Fdev%2Fslack-integration-tool/merge_requests/11",
      mergeRequestProjectPath:
        "techcorp%2Fplatform%2Fdev%2Fslack-integration-tool",
      mergeRequestProjectPathEncoded:
        "techcorp/platform/dev/slack-integration-tool",
      slackMessageTimeStamp: "123452",
      slackMessageChannel: "C12RD4RK9CK",
    };
    await dataStore.createMention(mention2);
    const mention3 = {
      createdAt: new Date(),
      mergeRequestId: "11",
      mergeRequestLink:
        "https://gitlab.com/api/v4/projects/techcorp%2Fplatform%2Fdev%2Fslack-integration-tool/merge_requests/11",
      mergeRequestProjectPath:
        "techcorp%2Fplatform%2Fdev%2Fslack-integration-tool",
      mergeRequestProjectPathEncoded:
        "techcorp/platform/dev/slack-integration-tool",
      slackMessageTimeStamp: "123453",
      slackMessageChannel: "C12RD4RK9CK",
    };
    await dataStore.createMention(mention3);
    const found = await dataStore.findAllMention(
      "11",
      "techcorp%2Fplatform%2Fdev%2Fslack-integration-tool"
    );
    if (!found) {
      fail();
    }
    expect(found.length).toEqual(3);
  });

  test("delete mentions created before", async () => {
    MergeRequestSlackMentionModel.collection.deleteMany({}); // Delete all mentions before
    const date = new Date();
    let mentionBefore = {
      createdAt: new Date(date.getTime() - 60 * 60 * 1000), // -1 hour
      mergeRequestId: "11",
      mergeRequestLink:
        "https://gitlab.com/api/v4/projects/techcorp%2Fplatform%2Fdev%2Fslack-integration-tool/merge_requests/11",
      mergeRequestProjectPath:
        "techcorp%2Fplatform%2Fdev%2Fslack-integration-tool",
      mergeRequestProjectPathEncoded:
        "techcorp/platform/dev/slack-integration-tool",
      slackMessageTimeStamp: "1234511",
      slackMessageChannel: "C12RD4RK9CK",
    };
    await dataStore.createMention(mentionBefore);
    mentionBefore = {
      createdAt: new Date(date.getTime() - 24 * 60 * 60 * 1000), // -1 day
      mergeRequestId: "11",
      mergeRequestLink:
        "https://gitlab.com/api/v4/projects/techcorp%2Fplatform%2Fdev%2Fslack-integration-tool/merge_requests/11",
      mergeRequestProjectPath:
        "techcorp%2Fplatform%2Fdev%2Fslack-integration-tool",
      mergeRequestProjectPathEncoded:
        "techcorp/platform/dev/slack-integration-tool",
      slackMessageTimeStamp: "12345112",
      slackMessageChannel: "C12RD4RK9CK",
    };
    await dataStore.createMention(mentionBefore);
    mentionBefore = {
      createdAt: new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000), // -7 day
      mergeRequestId: "11",
      mergeRequestLink:
        "https://gitlab.com/api/v4/projects/techcorp%2Fplatform%2Fdev%2Fslack-integration-tool/merge_requests/11",
      mergeRequestProjectPath:
        "techcorp%2Fplatform%2Fdev%2Fslack-integration-tool",
      mergeRequestProjectPathEncoded:
        "techcorp/platform/dev/slack-integration-tool",
      slackMessageTimeStamp: "12345113",
      slackMessageChannel: "C12RD4RK9CK",
    };
    await dataStore.createMention(mentionBefore);
    const mentionAfter = {
      createdAt: new Date(date.getTime() + 60 * 1000), // +1 minute
      mergeRequestId: "12",
      mergeRequestLink:
        "https://gitlab.com/api/v4/projects/techcorp%2Fplatform%2Fdev%2Fslack-integration-tool/merge_requests/12",
      mergeRequestProjectPath:
        "techcorp%2Fplatform%2Fdev%2Fslack-integration-tool",
      mergeRequestProjectPathEncoded:
        "techcorp/platform/dev/slack-integration-tool",
      slackMessageTimeStamp: "1234514",
      slackMessageChannel: "C12RD4RK9CK",
    };
    await dataStore.createMention(mentionAfter);
    const res = await dataStore.deleteMentionsCreatedBefore(date);
    expect(res.deletedCount).toBe(3);
  });

  test("cannot create mention of same MR in same message twice", async () => {
    const mention = {
      createdAt: new Date(),
      mergeRequestId: "11",
      mergeRequestLink:
        "https://gitlab.com/api/v4/projects/techcorp%2Fplatform%2Fdev%2Fslack-integration-tool/merge_requests/11",
      mergeRequestProjectPath:
        "techcorp%2Fplatform%2Fdev%2Fslack-integration-tool",
      mergeRequestProjectPathEncoded:
        "techcorp/platform/dev/slack-integration-tool",
      slackMessageTimeStamp: "12345111",
      slackMessageChannel: "C12RD4RK9CK",
    };
    await expect(dataStore.createMention(mention)).resolves.not.toThrow();
    await expect(dataStore.createMention(mention)).rejects.toThrow();
  });
});
