# github-ip-allow-lists-action

A GitHub Action that will load the Enterprise IP Allow List Entries with the CIDRs that are returned from the GitHub meta API (https://api.github.com/meta).

## Parameters

* `github_token`: A GitHub Access Token that has the `admin:enterprise` permission. `Required`

* `enterprise_slug`: The slug for the enterprise account to be modified. `Required`

* `metadata_section`: The CIDRs in the meta endpoint to be added to the allow list, e.g. `actions` or `hooks`. Check the [meta API](https://api.github.com/meta) for the names of the various services. `Required`

* `active`: A boolean that will create the IP Allow List entries in an active state (`true`) or disabled (any other value than `true`). `Optional`

## Examples

The following invocation will add all the meta API CIDRs as separate IP Allow List entries on the enterprise `goodcorp` in a disabled state for the `actions` ecosystem.

```yml
- name: Add Actions to Ip Allow List
  uses: peter-murray/github-ip-allow-list-action@v1
  with:
    github_token: ${{ secrets.ENTERPRISE_ACCESS_PAT }}
    enterprise_slug: goodcorp
    metadata_section: actions
    active: false
```