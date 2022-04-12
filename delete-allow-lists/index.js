const core = require('@actions/core')
  , enterprise = require('./src/enterprise')
  , githubClient = require('./src/github')
  ;

function getRequiredInputValue(key) {
  return core.getInput(key, { required: true });
}

async function run() {
  try {
    const githubToken = getRequiredInputValue('github_token')
      , enterpriseSlug = getRequiredInputValue('enterprise_slug')
      , matchDescription = core.getInput('match_description')
      , matchCidr = core.getInput('match_cidr')
      ;

    const octokit = githubClient.create(githubToken);
    const targetEnterprise = await enterprise.getEnterprise(enterpriseSlug, octokit);
    core.info(`Enterprise account: ${targetEnterprise.name} : ${targetEnterprise.url}`);

    if (!matchDescription && !matchCidr) {
      throw new Error('A filter of the description or cidrs must be specified.');
    }

    const allAllowLists = await enterprise.getEnterpriseIpAllowListEntries();

    const toRemove = [];
    if (matchDescription) {
      allAllowLists.forEach(allowListEntry => {
        if (allAllowListEntry.name === matchDescription) {
          toRemove.push(allowListEntry);
        }
      })
    }

    if (matchCidr) {
      //TODO
    }

    if (toRemove.length > 0) {
      await enterprise.deleteIpAllowLists(toRemove.map(allowList => allowList.id));
    } else {
      core.info(`No matches found in existing IP Allow List Entries`);
    }
  } catch (err) {
    core.setFailed(err);
  }
}

run();

async function addCidrsToEnterprise(enterprise, cidrs, isActive, label) {
  core.startGroup(`Modifying IP Allow List Entries: ${label}`);
  await enterprise.addAllowListCIDRs(label, cidrs, isActive);
  core.endGroup();
}

async function getMetaCIDRs(octokit, name) {
  const results = await octokit.rest.meta.get();
  core.info(`Loaded GitHub Meta API CIDRs`);

  return results.data[name];
}

function getCidrs(value) {
  const cidrs = value.split(',');

  const result = [];
  cidrs.forEach(cidr => {
    const cleanCidr = cidr.trim();
    if (cleanCidr.length > 0) {
      result.push(cidr.trim());
    }
  });

  return result;
}