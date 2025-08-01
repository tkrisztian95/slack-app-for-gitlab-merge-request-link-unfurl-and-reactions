# GitLab Merge Request Slack Integration

A Slack app that integrates GitLab merge requests with Slack message reactions, providing seamless workflow management between GitLab and Slack.

## Overview

This Slack application enables teams to:

- **Unfurl GitLab merge request links** in Slack messages with rich previews
- **Assign reviewers** by reacting with 👀 emoji on Slack messages
- **Track MR status changes** with automatic emoji reactions when MRs are approved, merged, or closed
- **Receive real-time updates** via GitLab webhooks

**Disclaimer**: This is a custom solution and not an official integration. The backend service requires deployment and proper configuration for both GitLab and Slack to work with private repositories and Slack channels. **No reliability guarantees are provided.**

## Features

### 🔍 Unfurl Merge Request Links

When you post a GitLab merge request link in Slack, the app automatically unfurls it with a rich preview showing MR details.

![Unfurling links](docs/unfurling_links.png)

### 👀 Assign Reviewers from Slack

- **Trigger**: React with 👀 emoji on a Slack message containing a GitLab MR link
- **Action**: Automatically assigns the reactor as a reviewer to the merge request in GitLab

### 📊 Track MR Status Changes

The app automatically reacts to Slack messages when MR status changes in GitLab:

| MR Status    | Emoji Reaction | Description    |
| ------------ | -------------- | -------------- |
| **Approved** | ✅             | MR is approved |
| **Merged**   | 🙌             | MR is merged   |
| **Closed**   | 🛑             | MR is closed   |

![MR status change reactions](docs/mr_status_update_reactions.png)

> **Note**: Status tracking requires GitLab webhooks to be configured. See [Configure GitLab Webhooks](#configure-gitlab-webhooks) for setup instructions.
>
> **Customization**: All emojis used for reactions are configurable in `src/config.json`. You can customize the emojis for different MR statuses and reviewer assignment.
>
> **Channel Restrictions**: You can restrict the app to work only in specific channels by adding channel IDs to the `channelsOnly` array in `src/config.json`. Leave the array empty to allow the app to work in all channels.

## Prerequisites

- **Node.js** (version 18 or newer)
- **TypeScript**
- **Docker** (optional, for containerized deployment)
- **Slack & GitLab accounts** with API access
- **ngrok** (for local development with webhooks)
- **Slack App** (created using the provided `manifest.yml` file)

## Installation & Setup

### 1. Create Slack App

Before configuring the environment, you need to create a Slack app using the provided manifest file.

#### Option A: Using Slack App Manifest (Recommended)

1. **Navigate to Slack API**:

   - Go to [api.slack.com/apps](https://api.slack.com/apps)
   - Click "Create New App"
   - Select "From an app manifest"

2. **Upload the manifest file**:

   - Upload the `manifest.yml` file from this repository
   - Review the app configuration
   - Click "Create App"

3. **Install the app to your workspace**:

   - Go to "OAuth & Permissions" in the sidebar
   - Click "Install to Workspace"
   - Authorize the app with the required permissions

4. **Get your credentials**:
   - **Bot User OAuth Token**: Copy from "OAuth & Permissions" (starts with `xoxb-`)
   - **Signing Secret**: Copy from "Basic Information" → "App Credentials"

#### Option B: Manual App Creation

If you prefer to create the app manually:

1. **Create a new Slack app** at [api.slack.com/apps](https://api.slack.com/apps)
2. **Configure the following settings**:
   - **Event Subscriptions**: Enable and add your webhook URL
   - **OAuth & Permissions**: Add required scopes (see manifest.yml for details)
   - **Interactivity & Shortcuts**: Enable and add your webhook URL
   - **App Home**: Configure as needed

### 2. Environment Configuration

1. Copy the environment template:

   ```bash
   cp .env.empty .env
   ```

2. Configure your environment variables in `.env`:

   ```bash
   # Slack Configuration (from step 1)
   SLACK_BOT_TOKEN=xoxb-your-bot-token-here
   SLACK_SIGNING_SECRET=your-signing-secret-here

   # GitLab Configuration
   GITLAB_ACCESS_TOKEN=your_gitlab_access_token
   GITLAB_WEBHOOK_SECRET=your_webhook_secret

   # Server Configuration
   PORT=3000
   ```

   > **Note**: The Slack credentials (`SLACK_BOT_TOKEN` and `SLACK_SIGNING_SECRET`) should be copied from the Slack app you created in the previous step.

### 2. Install Dependencies

```bash
# Install TypeScript globally
npm install -g typescript

# Install project dependencies
npm install
```

### 3. Build the Application

```bash
# Compile TypeScript
tsc
```

### 4. Run the Application

#### Option A: Direct Node.js Execution

```bash
node ./dist/index.js
```

Expected output: `⚡️ Bolt app is running!`

#### Option B: Docker Deployment

```bash
# Build Docker image
docker build . -t <your-username>/gitlab-mr-slack-app

# Run container
docker run -p <host-port>:8080 <your-username>/gitlab-mr-slack-app
```

The app runs on port 3000 by default (or 8080 in Docker).

## Configuration

### Adding the App to Slack Channels

1. Click the `+` button in your Slack channel
   ![Add to a channel (Step 1)](docs/install_in_channel_1.png)

2. Search for "apps" and select "Add apps to this channel"
   ![Add to a channel (Step 2)](docs/install_in_channel_2.png)

3. Search for "gitlab" and add the "GitLab MR react" app
   ![Add to a channel (Step 3)](docs/install_in_channel_3.png)

4. Confirm the app has been added successfully
   ![Add to a channel (Step 4)](docs/install_in_channel_4.png)

The app will now listen for messages containing GitLab merge request links.

### Configure GitLab Webhooks

Webhooks are essential for the app to receive real-time updates about MR status changes. Without webhooks, the app cannot automatically react to MR status updates in Slack.

#### Webhook Endpoint

The webhook endpoint for your deployment is:

```
https://your-domain-or-server-url/gitlab/webhooks
```

> **Note**: Replace `your-domain-or-server-url` with your actual server domain or ngrok URL for local development.

#### Setup Instructions

##### Option 1: Project-Level Webhooks (Recommended for testing)

1. **Navigate to your GitLab project**:

   - Go to your GitLab project
   - Navigate to **Settings → Webhooks**
     ![Configure Webhooks in GitLab 1](docs/webhooks_1.png)

2. **Configure the webhook settings**:

   - **URL**: `https://your-domain-or-server-url/gitlab/webhooks`
   - **Events**: Check only "Merge Request events" (uncheck others)
   - **Secret token**: Use the same value as `GITLAB_WEBHOOK_SECRET` from your `.env` file
   - **SSL verification**: Enable (recommended for production)

3. **Save the webhook**:

   - Click "Add webhook"
     ![Configure Webhooks in GitLab 2](docs/webhooks_2.png)

4. **Test the webhook**:
   - Click "Test" → "Merge request events"
   - Expected result: **200 status code**
   - If successful, you'll see a green checkmark

##### Option 2: Group/Organization-Level Webhooks (Recommended for production)

For organizations with multiple projects, configure webhooks at the group level:

1. **Navigate to your GitLab group**:

   - Go to your GitLab group/organization
   - Navigate to **Settings → Webhooks**

2. **Configure the same settings as above**

3. **All projects in the group will automatically use this webhook**

#### Verification

To verify webhooks are working:

1. **Check webhook logs** in GitLab:

   - Go to **Settings → Webhooks**
   - Click on your webhook
   - View "Recent deliveries" tab

2. **Test with a real MR**:
   - Create or update a merge request
   - Check if the corresponding Slack message gets the appropriate emoji reaction

#### Troubleshooting Webhooks

| Issue                      | Solution                                                                     |
| -------------------------- | ---------------------------------------------------------------------------- |
| **400/401 errors**         | Check your webhook URL and secret token                                      |
| **SSL errors**             | Verify SSL certificate or disable SSL verification for testing               |
| **No reactions in Slack**  | Ensure the app has proper permissions and the MR link is in the same channel |
| **Webhook not triggering** | Verify "Merge Request events" is checked and the webhook is active           |

> **Pro Tip**: For local development, use ngrok to expose your local server and use the ngrok URL as your webhook endpoint.

## Configuration

The app behavior can be customized through the `src/config.json` file:

### Emoji Customization

You can customize all emoji reactions used by the app:

```json
{
  "onReactionAdded": {
    "assignReviewer": {
      "reaction": "eyes" // Emoji for assigning reviewers
    }
  },
  "gitlabWebhooks": {
    "mergeRequest": {
      "useReactions": {
        "onApproved": "approved2", // Emoji for approved MRs
        "onMerged": "merged", // Emoji for merged MRs
        "onClosed": "octagonal_sign" // Emoji for closed MRs
      }
    }
  }
}
```

### Channel Restrictions

To restrict the app to work only in specific channels:

```json
{
  "channelsOnly": ["C1234567890", "C0987654321"]
}
```

- Add channel IDs to the `channelsOnly` array
- Leave the array empty `[]` to allow the app in all channels
- To find a channel ID, right-click the channel in Slack and select "Copy link" - the ID is the last part of the URL

### Feature Toggles

You can enable/disable specific features:

```json
{
  "onLinkShared": {
    "autoAssignAuthorAsAssignee": true, // Auto-assign MR author
    "unfrulLinkInComposer": true, // Unfurl in composer
    "unfurlLinkInMessages": true // Unfurl in messages
  },
  "onReactionAdded": {
    "assignReviewer": {
      "enabled": true // Enable reviewer assignment
    }
  },
  "gitlabWebhooks": {
    "enabled": true, // Enable webhook processing
    "mergeRequest": {
      "updateUnfurls": true, // Update unfurls on MR changes
      "addReactions": true // Add reactions on MR status changes
    }
  }
}
```

## Development

For local development with webhook testing:

1. Expose your local port using ngrok:

   ```bash
   ngrok http 3000
   ```

2. Update your GitLab webhook URL to use the ngrok URL

3. The app requires Slack and GitLab API access to start properly

### Project Structure

```
├── src/           # TypeScript source code
├── dist/          # Compiled JavaScript
├── docs/          # Documentation and images
├── .env.empty     # Environment template
└── README.md      # This file
```

## Troubleshooting

### Common Issues

1. **App won't start**: Ensure all environment variables are properly configured
2. **Webhooks not working**: Verify the webhook URL and secret token
3. **Reactions not appearing**: Check that the app has proper permissions in Slack

### Debug Mode

Enable debug logging by setting the `DEBUG` environment variable:

```bash
DEBUG=* node ./dist/index.js
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

Licensed under the Apache 2.0 license.

## Copyright

Copyright (c) 2025 Krisztian Toth & Acrolinx GmbH

---

**Notes:**

- This project was developed with support from [Acrolinx](https://www.acrolinx.com/) GmbH
- This is not an official Acrolinx open-source package. For official Acrolinx open-source projects, visit the [Acrolinx GitHub page](https://github.com/acrolinx/)
