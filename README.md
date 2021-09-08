# github-ip-allow-lists-action

A GitHub Action that will load the Enterprise IP Allow List Entries with the CIDRs that are returned from the GitHub meta API (https://api.github.com/meta).


## Requirements & Implmentation Details

You will need a GitHub PAT that has the `admin:enterprise` permission to run this action and make use of it's features. This type of permission is pretty extreme so you should protect the access to any repository that you are going to use this action.

There is a potential that you might end up adding a large pool of CIDRs to your enterprise. All added CIDRs will be named in a way so as to track then back to the GitHub Meta API as a source of the entry.

When adding a large number of entries, you can run into the risk of hitting abuse or API limits with the endpoints that this Action uses (e.g. adding the `actions` meta CIDRs).

To mitigate these problems, firstly only new CIDRs are added, which means that if the CIDR is already present in the IP Allow List entries, no modifications or API calls will be performed. One thing that may result in is that the `active` state may be different to what you set the Action to so in the parameters if this is the case.

API retry and rate throttling along with a secondary queue is implemented to control the rate a retires and to be respectful to the APIs being targeted. This will ensure that the Action should avoid all failures due to rate limiting or abuse triggering protections on GitHub.com.


## Parameters

* `github_token`: A GitHub Access Token that has the `admin:enterprise` permission. `Required`

* `enterprise_slug`: The slug for the enterprise account to be modified. `Required`

* `metadata_section`: The CIDRs in the meta endpoint to be added to the allow list, e.g. `actions` or `hooks`. Check the [meta API](https://api.github.com/meta) for the names of the various services.

* `custom_cidrs`: A list of custom CIDRs `,` separated that you wish to add, e.g. `192.168.2.0/24, 192.168.3.0/24`

* `custom_cidrs_label`: A custom label to apply to the custom CIDRs when you add them as IP Allow List entries, defaults to `Custom CIDR from github-ip-allow-list-action`.

* `active`: A boolean that will create the IP Allow List entries in an active state (`true`) or disabled (any other value than `true`). `Optional`

**At least one of `custom_cidrs` or `metadata_section` must be specified, but you can also include both together.**


## Examples

The following invocation will add all the meta API CIDRs as separate IP Allow List entries on the enterprise `goodcorp` in a disabled state for the `actions` ecosystem.

```yml
- name: Add Actions to IP Allow List
  uses: peter-murray/github-ip-allow-list-action@v1
  with:
    github_token: ${{ secrets.ENTERPRISE_ACCESS_PAT }}
    enterprise_slug: goodcorp
    metadata_section: actions
    active: false
```

Adding some custom CIDRs to the allow list `192.168.2.0/24`, `192.168.3.0/24` and `10.0.1.0/24`

```yml
- name: Add Custom CIDRs to IP Allow List
  uses: peter-murray/github-ip-allow-list-action@v1
  with:
    github_token: ${{ secrets.ENTERPRISE_ACCESS_PAT }}
    enterprise_slug: goodcorp
    custom_cidrs: |
      192.168.2.0/24,
      192.168.3.0/24,
      10.0.1.0/24
    active: false
```
