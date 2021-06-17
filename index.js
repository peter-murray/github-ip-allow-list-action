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
            , metadataSection = getRequiredInputValue('metadata_section')
            , enterpriseSlug = getRequiredInputValue('enterprise_slug')
            , isActive = core.getInput('active') === 'true'
            ;

        const octokit = githubClient.create(githubToken);
        const targetEnterprise = await enterprise.getEnterprise(enterpriseSlug, octokit);
        core.info(`Enterprise account: ${targetEnterprise.name} : ${targetEnterprise.url}`);

        const cidrs = await getMetaCIDRs(octokit, metadataSection);
        if (cidrs) {
            core.info(`CIDRs to add: ${JSON.stringify(cidrs)}`);

            core.startGroup('Building IP Allow List Entries');
            await targetEnterprise.addAllowListCIDRs(`GitHub Meta CIDR for ${metadataSection}`, cidrs, isActive);
            core.endGroup();
        } else {
            throw new Error(`The metadata CIDRs for '${metadataSection}' were unable to be resolved.`);
        }
    } catch (err) {
        core.setFailed(err);
    }
}

run();

async function getMetaCIDRs(octokit, name) {
    const results = await octokit.rest.meta.get();
    core.info(`Loaded GitHub Meta API CIDRs`);

    return results.data[name];
}