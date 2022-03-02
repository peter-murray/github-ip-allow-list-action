const core = require('@actions/core')
const Bottleneck = require('bottleneck');
const IPAllowListEntry = require('./ipAllowListEntry');

module.exports.getEnterprise = async function(enterpriseSlug, octokit) {
    const enterprise = new Enterprise(enterpriseSlug, octokit);
    await enterprise.initialize();

    return enterprise;
}

class Enterprise {

    constructor(enterpriseSlug, octokit) {
        this._name = enterpriseSlug;
        this._octokit = octokit;

        this._loaded = false;
        this._limiter = new Bottleneck({
            minTime: 150,
            maxConcurrent: 10,
        })
    }

    async initialize() {
        if (this._loaded) {
            return;
        }
        await this.getEnterpriseIpAllowListEntries();
    }

    get octokit() {
        return this._octokit;
    }

    get slug() {
        return this._name;
    }

    get id() {
        return this._loaded ? this._data.metadata.id : undefined;
    }

    get name() {
        return this._loaded ? this._data.metadata.name : undefined;
    }

    get url() {
        return this._loaded ? this._data.metadata.url : undefined;
    }

    async getEnterpriseIpAllowListEntries() {
        if (!this._loaded) {
            const results = [];
            const queryParameters = {
                query: `
                    query getEnterprise($enterpriseName: String!, $cursor: String) {
                        enterprise(slug: $enterpriseName) {
                            databaseId
                            name
                            slug
                            url,
                            id,
                            ownerInfo {
                                ipAllowListEntries(first: 100 after: $cursor) {
                                    pageInfo {
                                        endCursor
                                        hasNextPage
                                    }
                                    totalCount
                                    nodes {
                                        name
                                        createdAt
                                        updatedAt
                                        isActive
                                        allowListValue
                                    }
                                }
                            }
                        }
                    }
                `,
                enterpriseName: this.slug,
            };
        
            let enterpriseMetaData = undefined;

            let hasNextPage = false;
            do {
                const queryResult = await this.octokit.graphql(queryParameters);
        
                if (!enterpriseMetaData) {
                    enterpriseMetaData = {
                        databaseId: queryResult.enterprise.databaseId,
                        name: queryResult.enterprise.name,
                        url: queryResult.enterprise.url,
                        id: queryResult.enterprise.id,
                    }
                }

                const ipEntries = getObject(queryResult, 'enterprise', 'ownerInfo', 'ipAllowListEntries', 'nodes');
                if (ipEntries) {
                    results.push(...ipEntries.map(data => new IPAllowListEntry(data)));
                }
                
                const pageInfo = getObject(queryResult, 'enterprise', 'ownerInfo', 'ipAllowListEntries', 'pageInfo');
                hasNextPage = pageInfo ? pageInfo.hasNextPage : false;
                if (hasNextPage) {
                    queryParameters.cursor = pageInfo.endCursor;
                }
            } while (hasNextPage);
        
            this._loaded = true;
            this._data = {
                metadata: enterpriseMetaData,
                ipAllowListEntries: results
            };
        }

        return this._data.ipAllowListEntries;
    }

    async addAllowListCIDRs(name, cidrs, isActive) {
        const promises = [];

        cidrs.forEach(cidr => {
            promises.push(this.addIpAllowList(name, cidr, isActive));
        });

        return await Promise.all(promises);
    }

    async addIpAllowList(name, cidr, isActive) {
        const existing = await this.getEnterpriseIpAllowListEntries();
        const existingCIDRs = existing.map(value => value.cidr);
        const matchedIndex = existingCIDRs.indexOf(cidr);

        if (matchedIndex > -1) {
            return existing[matchedIndex];
        } else  {
            return await this._limiter.schedule(() => addIpAllowList(this.octokit, this.id, name, cidr, isActive));
        }
    }
}

async function addIpAllowList(octokit, id, name, cidr, isActive) {
    core.startGroup(`Adding cidr: ${cidr}`);
    core.info(`  parameters`);
    core.info(`     owner:  ${id}`);
    core.info(`     name:   ${name}`);
    core.info(`     cidr:   ${cidr}`);
    core.info(`     active: ${!!isActive}`);
    core.endGroup();

    const ipAllowList = await octokit.graphql({
        query: `
            mutation addAllowList($owner: ID!, $cidr: String!, $name: String!, $isActive: Boolean!) {
                createIpAllowListEntry(input: {
                    allowListValue: $cidr,
                    isActive: $isActive,
                    name: $name,
                    ownerId: $owner
                }) {
                    clientMutationId
                    ipAllowListEntry {
                        allowListValue
                        createdAt
                        updatedAt
                        isActive
                        name
                    }
                }
            }
            `,
        owner: id,
        name: name,
        cidr: cidr,
        isActive: !!isActive
    });
    return new IPAllowListEntry(ipAllowList);
}

function getObject(target, ...path) {
    if (target !== null && target !== undefined) {
      const value = target[path[0]];
  
      if (path.length > 1) {
        return getObject(value, ...path.slice(1));
      } else {
        return value;
      }
    }
    return null;
  }