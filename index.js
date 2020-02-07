const core = require("@actions/core");
const github = require("@actions/github");

function parseAuthors(input) {
  if (!input) {
    return [];
  }

  return input.split(",").map(login => login.toLowerCase().trim())
}

async function run() {
  try {
    const respondableId = core.getInput("respondableId", { required: true });
    const shouldClose = core.getInput("shouldClose", { required: true })
    const response = core.getInput("response", { required: true });
    const author = core.getInput("author", { required: true });
    const token = process.env.GITHUB_TOKEN;
    const exemptedAuthors = parseAuthors(core.getInput("exemptedAuthors"));

    console.log(shouldClose, 'should close');

    if (!token) {
      core.setFailed("GITHUB_TOKEN is not available");
      return;
    }

    if (exemptedAuthors.includes(author.toLowerCase())) {
      console.debug(`${author} is exempt from autoresponse`);
      return;
    }

    const octokit = new github.GitHub(token);

    await octokit.graphql(`
      mutation($respondableId: ID!, $response: String!) {
        addComment(input: { subjectId: $respondableId, body: $response}) {
          clientMutationId
        }
      }
    `, { respondableId, response });

    if (shouldClose) {
      await octokit.graphql(`
        mutation($id: ID!) {
          updateIssue(input: { id: $id, state: CLOSED}) {
            clientMutationId
          }
        }
      `, { respondableId });
    }

  } catch(error) {
    core.setFailed(`Error adding autoresponse: ${error.message}`);
  }
}

run();
